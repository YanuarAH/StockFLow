import { cleanProductName, formatIDR } from "./knowledge";
import {
  buildAnomalies,
  buildProfitExcel,
  buildPurchaseOrder,
  buildStockInDraft,
} from "./tools";
import type { AgentResult, ChatTurn, StoreSnapshot } from "./types";

interface GeminiPlan {
  reply?: string;
  action?: "NONE" | "STOCK_IN" | "EXCEL" | "RESTOCK_CHECK";
  lowStockOnly?: boolean;
  stockItems?: { rawName: string; qty?: number; unitCost?: number; unit?: string }[];
  suggestions?: string[];
}

function contextBlock(snap: StoreSnapshot): string {
  const rows = snap.products
    .slice(0, 80)
    .map(
      (p) =>
        `- ${p.name} (Kategori: ${p.categoryName || "Umum"}) | stok ${p.stock} ${p.unit} (min ${p.minStock}) | modal ${p.costPrice} | jual ${p.sellPrice} | terjual 14h: ${p.sold14d}, 30h: ${p.sold30d}`
    )
    .join("\n");
  const cats = (snap.categories || []).join(", ") || "Belum ada kategori";
  return `TOKO: ${snap.storeName}
KATEGORI TOKO: ${cats}
HARI INI: ${snap.today.txCount} transaksi, omzet ${formatIDR(snap.today.revenue)}, laba ${formatIDR(snap.today.profit)}
7 HARI: omzet ${formatIDR(snap.week.revenue)}, laba ${formatIDR(snap.week.profit)}
30 HARI: omzet ${formatIDR(snap.month.revenue)}, laba ${formatIDR(snap.month.profit)}
TOTAL PRODUK TERDAFTAR (${snap.products.length} item):
${rows || "(belum ada produk)"}`;
}

const SYSTEM_PROMPT = `Kamu adalah asisten gudang dan konsultan operasional ritel UMKM yang cerdas, ramah, dan solutif untuk pemilik warung/toko di Indonesia di dalam aplikasi StokUMKM.
Gaya bicara: bahasa Indonesia santai, hangat, jelas, dan berwawasan bisnis praktis (seperti partner bisnis yang paham seluk-beluk warung). Boleh gunakan **tebal** untuk angka atau nama barang penting.

KEMAMPUAN UTAMA:
1. Menjawab stok & harga barang spesifik: Jawab persis sisa stok, satuan, harga modal, harga jual, dan apakah stok aman atau kritis.
2. Menampilkan daftar barang: Jika pengguna meminta "list barang", "ada barang apa saja", atau filter kategori/kondisi, tampilkan daftar produk rapi per kategori atau sesuai permintaan.
3. Diskusi & Rekomendasi Barang Baru: Jika pengguna bertanya "barang apa yang sebaiknya ditambahkan?", "rekomendasi produk", "toko saya kurang apa", analisislah katalog toko saat ini, lalu rekomendasikan barang-barang kebutuhan pokok Indonesia yang belum ada (misal: Telur ayam ras sebagai traffic builder harian, bumbu sachet Royco/Masako, air mineral Aqua/Le Minerale, kopi seduh Good Day/Luwak, obat warung darurat P3K bermargin 30-40% seperti Bodrex/Tolak Angin/Promag, rokok filter & korek gas, gas elpiji 3kg, galon). Berikan tips tes pasar 1-2 renceng dulu.
4. Konsultasi Bisnis Warung: Berikan strategi omzet (impulse buying di kasir, cross-selling sembako + pelengkap bermargin tebal, QRIS, memisahkan uang laci kasir dan dompet pribadi).
5. Saran Harga Jual: Hitung margin realistis (sembako 10-15%, camilan/minuman 20-25%) dibulatkan ke kelipatan 500.
6. Catat Barang Masuk (1 atau BANYAK sekaligus): Pengguna boleh mencatat stok masuk 1 barang atau banyak barang dalam 1 pesan. Contoh: "tambah minyak 20" (1 item) atau "tambah beras 10, gula 5, telur 20" (3 items dalam 1 chat). Parsing yang ketat untuk setiap item dalam satu pesan.

ATURAN:
1. Jawab HANYA berdasarkan DATA TOKO yang diberikan untuk angka stok, omzet, dan laba riil.
2. Jika pengguna menanyakan ketersediaan atau stok barang yang TIDAK ADA di data toko (misalnya bertanya stok beras padahal toko tidak menjual atau belum menginput beras), kamu HARUS secara jujur dan tegas menyatakan bahwa barang tersebut BELUM ADA / BELUM TERDAFTAR di toko. JANGAN PERNAH menjawab dengan data barang lain! Tawarkan bantuan untuk mencatatnya jika pengguna baru saja kulakan.
3. Pengguna boleh ngobrol bebas tanpa format kaku. Pahami salah ketik dan abaikan kata mubazir seperti "merek", "merk", "cap".
4. Pilih "action":
   - "STOCK_IN": pengguna bermaksud MENAMBAH / MENCATAT stok barang masuk (misal: "tambah minyak 20", "masuk indomie 50 pcs modal 2800", "tambah beras 10, gula 5 modal 16k, telur 20 modal 26k"). Boleh multiple items sekaligus! Isi stockItems array dengan nama baku, qty, unitCost, unit.
   - "EXCEL": pengguna meminta file Excel/CSV/laporan unduhan. Isi lowStockOnly=true bila konteksnya daftar belanja/kulakan.
   - "RESTOCK_CHECK": pengguna meminta cek peringatan barang kritis / burn rate / kebocoran stok.
   - "NONE": untuk pertanyaan stok, list barang, rekomendasi produk baru, strategi omzet, tanya untung, saran harga, dan ngobrol diskusi biasa. Jawab tuntas langsung di "reply".
5. "suggestions": selalu berikan 2-4 ide pertanyaan lanjutan pendek yang relevan.

KELUARKAN JSON MURNI: {"reply": string, "action": "NONE"|"STOCK_IN"|"EXCEL"|"RESTOCK_CHECK", "lowStockOnly": boolean, "stockItems": [{"rawName": string, "qty": number, "unitCost": number, "unit": string}], "suggestions": [string]}`;

export async function runGeminiAgent(
  message: string,
  history: ChatTurn[],
  snap: StoreSnapshot
): Promise<AgentResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const contents = [
    ...history.slice(-8).map((h) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\nDATA TOKO (real-time):\n${contextBlock(snap)}` }] },
          contents,
          generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
        }),
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const plan: GeminiPlan = JSON.parse(text);
    const reply = (plan.reply || "").trim();
    if (!reply) return null;

    const result: AgentResult = {
      reply,
      suggestions: Array.isArray(plan.suggestions) ? plan.suggestions.slice(0, 3) : undefined,
    };

    if (plan.action === "STOCK_IN" && plan.stockItems?.length) {
      const raws = plan.stockItems
        .map((s) => {
          const c = cleanProductName(s.rawName || "");
          return {
            rawName: c.cleanName || s.rawName,
            qty: s.qty && s.qty > 0 ? Math.round(s.qty) : 10,
            unitCost: s.unitCost && s.unitCost > 0 ? Math.round(s.unitCost) : c.inferredCost,
            unit: s.unit || c.inferredUnit,
          };
        })
        .filter((r) => r.rawName);
      if (raws.length) {
        result.toolUsed = "matchProductCatalog";
        result.stockInDraft = buildStockInDraft(snap, raws);
      }
    } else if (plan.action === "EXCEL") {
      result.toolUsed = "generateExcel";
      result.excelPayload = buildProfitExcel(snap, !!plan.lowStockOnly);
    } else if (plan.action === "RESTOCK_CHECK") {
      const anomalies = buildAnomalies(snap);
      result.toolUsed = "detectInventoryAnomalies";
      result.anomalies = anomalies;
      result.excelPayload = buildPurchaseOrder(anomalies);
    }

    return result;
  } catch {
    return null;
  }
}

