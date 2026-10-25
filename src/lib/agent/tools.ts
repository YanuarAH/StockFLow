import { prisma } from "@/lib/prisma";
import {
  calculateSimilarity,
  cleanProductName,
  formatIDR,
  type RawStockItem,
} from "./knowledge";
import type {
  AnomalyItem,
  CustomExcelPayload,
  MatchedStockItem,
  PeriodTotals,
  ProductSnapshot,
  StoreSnapshot,
} from "./types";

const DAY = 24 * 60 * 60 * 1000;

function sumPeriod(rows: { totalAmount: number; totalProfit: number }[]): PeriodTotals {
  return {
    revenue: rows.reduce((s, r) => s + r.totalAmount, 0),
    profit: rows.reduce((s, r) => s + r.totalProfit, 0),
    txCount: rows.length,
  };
}

export async function buildSnapshot(storeId: string, storeName: string): Promise<StoreSnapshot> {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start7 = new Date(startToday.getTime() - 6 * DAY);
  const start30 = new Date(startToday.getTime() - 29 * DAY);

  const [products, categories, txs, items] = await Promise.all([
    prisma.product.findMany({
      where: { storeId },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      where: { storeId, createdAt: { gte: start30 } },
      select: { totalAmount: true, totalProfit: true, createdAt: true },
    }),
    prisma.transactionItem.findMany({
      where: { transaction: { storeId, createdAt: { gte: start30 } } },
      select: {
        productId: true,
        productName: true,
        quantity: true,
        sellPrice: true,
        costPrice: true,
        transaction: { select: { createdAt: true } },
      },
    }),
  ]);

  const start14 = new Date(startToday.getTime() - 13 * DAY);
  const stat = new Map<string, { s14: number; s30: number; profit: number }>();
  for (const it of items) {
    const key = it.productId ?? it.productName;
    const cur = stat.get(key) ?? { s14: 0, s30: 0, profit: 0 };
    cur.s30 += it.quantity;
    cur.profit += (it.sellPrice - it.costPrice) * it.quantity;
    if (it.transaction.createdAt >= start14) cur.s14 += it.quantity;
    stat.set(key, cur);
  }

  const snap: ProductSnapshot[] = products.map((p) => {
    const st = stat.get(p.id) ?? stat.get(p.name) ?? { s14: 0, s30: 0, profit: 0 };
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryName: p.category?.name || "Lainnya",
      unit: p.unit,
      stock: p.stock,
      minStock: p.minStock,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      sold14d: st.s14,
      sold30d: st.s30,
      profit30d: st.profit,
    };
  });

  return {
    storeName,
    today: sumPeriod(txs.filter((t) => t.createdAt >= startToday)),
    week: sumPeriod(txs.filter((t) => t.createdAt >= start7)),
    month: sumPeriod(txs),
    products: snap,
    categories: categories.map((c) => c.name),
  };
}

export function buildAnomalies(snap: StoreSnapshot): AnomalyItem[] {
  const rank = { ANOMALY_NEGATIVE_MARGIN: 0, CRITICAL: 1, WARNING: 2, SAFE: 3 } as const;

  return snap.products
    .map((p): AnomalyItem => {
      const burn = Number((p.sold14d / 14).toFixed(2));
      const days = burn > 0 ? Math.max(0, Math.round(p.stock / burn)) : null;
      const qty = Math.max(Math.ceil(burn * 14) + p.minStock - p.stock, p.minStock * 2);

      let status: AnomalyItem["status"] = "SAFE";
      let reason = "Stok aman";

      if (p.sellPrice < p.costPrice) {
        status = "ANOMALY_NEGATIVE_MARGIN";
        reason = `Harga jual (${formatIDR(p.sellPrice)}) lebih rendah dari modal (${formatIDR(p.costPrice)}). Toko rugi tiap barang ini terjual.`;
      } else if (p.stock <= 0 || (days !== null && days <= 3) || p.stock <= Math.ceil(p.minStock * 0.6)) {
        status = "CRITICAL";
        reason =
          days !== null
            ? `Diperkirakan habis dalam ~${days} hari (laku ${burn} ${p.unit}/hari).`
            : `Stok tinggal ${p.stock} ${p.unit}, jauh di bawah batas minimum ${p.minStock}.`;
      } else if (p.stock <= p.minStock || (days !== null && days <= 7)) {
        status = "WARNING";
        reason =
          days !== null
            ? `Cukup untuk ~${days} hari lagi.`
            : `Stok ${p.stock} ${p.unit} sudah menyentuh batas minimum ${p.minStock}.`;
      }

      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        currentStock: p.stock,
        minStock: p.minStock,
        costPrice: p.costPrice,
        soldLast14Days: p.sold14d,
        dailyBurnRate: burn,
        daysUntilStockout: days,
        recommendedRestockQty: qty,
        estimatedRestockCost: qty * p.costPrice,
        status,
        reason,
      };
    })
    .filter((a) => a.status !== "SAFE")
    .sort((a, b) => rank[a.status] - rank[b.status]);
}

export function buildPurchaseOrder(anomalies: AnomalyItem[]): CustomExcelPayload | undefined {
  if (!anomalies.length) return undefined;
  const date = new Date().toISOString().slice(0, 10);
  return {
    filename: `Draft_Purchase_Order_${date}.csv`,
    title: "Draf Purchase Order (PO) Kulakan",
    description: `${anomalies.length} barang perlu dipesan berdasarkan kecepatan jual 14 hari terakhir.`,
    headers: ["Kode SKU", "Nama Barang", "Sisa Stok", "Laku / Hari", "Estimasi Habis (Hari)", "Qty Order", "Satuan", "Harga Modal (Rp)", "Subtotal (Rp)"],
    rows: [
      ...anomalies.map((a) => [
        a.sku, a.name, a.currentStock, a.dailyBurnRate,
        a.daysUntilStockout ?? "-", a.recommendedRestockQty, a.unit,
        a.costPrice, a.estimatedRestockCost,
      ]),
      ["TOTAL", `${anomalies.length} barang`, "", "", "", "", "", "", anomalies.reduce((s, a) => s + a.estimatedRestockCost, 0)],
    ],
  };
}

export function buildProfitExcel(snap: StoreSnapshot, lowStockOnly: boolean): CustomExcelPayload {
  const date = new Date().toISOString().slice(0, 10);
  const list = snap.products
    .map((p) => {
      const margin = p.sellPrice - p.costPrice;
      const need = Math.max(p.minStock * 2 - p.stock, 10);
      return {
        ...p,
        margin,
        marginPct: p.sellPrice > 0 ? Math.round((margin / p.sellPrice) * 100) : 0,
        need,
        budget: need * p.costPrice,
      };
    })
    .filter((p) => !lowStockOnly || p.stock <= p.minStock)
    .sort((a, b) => b.profit30d - a.profit30d || b.margin - a.margin);

  const totalProfit = list.reduce((s, p) => s + p.profit30d, 0);
  const totalBudget = list.reduce((s, p) => s + p.budget, 0);

  return {
    filename: lowStockOnly ? `Daftar_Belanja_Prioritas_${date}.csv` : `Analisis_Profit_Produk_${date}.csv`,
    title: lowStockOnly ? "Daftar Belanja Prioritas (Stok Menipis, Laba Terbesar)" : "Analisis Profit & Margin Produk (30 Hari)",
    description: `${list.length} produk. Total laba bersih 30 hari: ${formatIDR(totalProfit)}. Dihitung oleh sistem, bukan AI.`,
    headers: ["Kode SKU", "Nama Barang", "Stok", "Batas Min", "Modal (Rp)", "Harga Jual (Rp)", "Margin/Unit (Rp)", "Margin (%)", "Terjual 30 Hari", "Laba 30 Hari (Rp)", "Saran Qty Kulakan", "Estimasi Modal Kulakan (Rp)"],
    rows: [
      ...list.map((p) => [
        p.sku, p.name, `${p.stock} ${p.unit}`, `${p.minStock} ${p.unit}`,
        p.costPrice, p.sellPrice, p.margin, `${p.marginPct}%`,
        `${p.sold30d} ${p.unit}`, p.profit30d, `${p.need} ${p.unit}`, p.budget,
      ]),
      ["TOTAL", `${list.length} barang`, "", "", "", "", "", "", "", totalProfit, "", totalBudget],
    ],
  };
}

export function buildStockInDraft(snap: StoreSnapshot, raws: RawStockItem[]): MatchedStockItem[] {
  return raws.map((raw) => {
    let best: ProductSnapshot | null = null;
    let score = 0;
    for (const p of snap.products) {
      const s = calculateSimilarity(raw.rawName, p.name);
      if (s > score) {
        score = s;
        best = p;
      }
    }
    const m = best && score >= 55 ? best : null;
    const cleaned = cleanProductName(raw.rawName);
    return {
      rawName: raw.rawName,
      matchedProductId: m ? m.id : null,
      matchedProductName: m ? m.name : raw.rawName,
      matchedSku: m ? m.sku : "BARU",
      unit: m ? m.unit : raw.unit || cleaned.inferredUnit || "pcs",
      inferredCategory: m ? (m.categoryName || "") : cleaned.inferredCategory,
      confidence: m ? score : 0,
      qty: raw.qty,
      unitCost: raw.unitCost > 0 ? raw.unitCost : m ? m.costPrice : cleaned.inferredCost || 15000,
      previousCost: m ? m.costPrice : 0,
      currentStock: m ? m.stock : 0,
    };
  });
}

export async function executeStockIn(storeId: string, items: MatchedStockItem[]): Promise<string[]> {
  const valid = items.filter((i) => i.qty > 0);
  return prisma.$transaction(async (tx) => {
    const done: string[] = [];
    for (const item of valid) {
      if (item.matchedProductId) {
        const existing = await tx.product.findFirst({ where: { id: item.matchedProductId, storeId } });
        if (existing) {
          const cost = item.unitCost > 0 ? item.unitCost : existing.costPrice;
          await tx.product.update({
            where: { id: existing.id },
            data: { stock: { increment: item.qty }, costPrice: cost },
          });
          await tx.stockMovement.create({
            data: {
              productId: existing.id,
              storeId,
              type: "IN",
              quantity: item.qty,
              note: `Asisten AI: +${item.qty} ${existing.unit} (modal ${formatIDR(cost)})`,
            },
          });
          done.push(`${existing.name} (+${item.qty} ${existing.unit})`);
          continue;
        }
      }

      const c = cleanProductName(item.rawName);
      const name = c.cleanName || item.rawName;
      const cost = item.unitCost > 0 ? item.unitCost : c.inferredCost || 10000;
      const targetCategory = item.inferredCategory || c.inferredCategory;
      let categoryId: string | null = null;

      // Otomatis deteksi & hubungkan kategori barang
      if (targetCategory) {
        let cat = await tx.category.findFirst({
          where: { storeId, name: { equals: targetCategory, mode: "insensitive" } },
        });
        if (!cat) {
          cat = await tx.category.create({
            data: { name: targetCategory, storeId },
          });
        }
        categoryId = cat.id;
      }

      const created = await tx.product.create({
        data: {
          name,
          sku: `BRG-${Math.floor(1000 + Math.random() * 9000)}`,
          unit: item.unit || c.inferredUnit || "pcs",
          categoryId,
          costPrice: cost,
          sellPrice: Math.round((cost * 1.18) / 500) * 500,
          stock: item.qty,
          minStock: 5,
          storeId,
        },
      });
      await tx.stockMovement.create({
        data: {
          productId: created.id,
          storeId,
          type: "IN",
          quantity: item.qty,
          note: `Asisten AI: barang baru ${created.name}${targetCategory ? ` (Kategori: ${targetCategory})` : ""}`,
        },
      });
      done.push(`${created.name} [BARU] (+${item.qty} ${created.unit}${targetCategory ? `, ${targetCategory}` : ""})`);
    }
    return done;
  });
}

