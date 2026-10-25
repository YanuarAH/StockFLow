import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Start of 7 days ago
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  const [
    products,
    todayTransactions,
    monthTransactions,
    last7DaysTransactions,
    recentTransactions,
    topSellingItems,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: session.storeId },
      include: { category: true },
      orderBy: { stock: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        storeId: session.storeId,
        createdAt: { gte: startOfToday },
      },
    }),
    prisma.transaction.findMany({
      where: {
        storeId: session.storeId,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.transaction.findMany({
      where: {
        storeId: session.storeId,
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: { storeId: session.storeId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.transactionItem.groupBy({
      by: ["productName", "unit"],
      where: {
        transaction: {
          storeId: session.storeId,
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    }),
  ]);

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const todayProfit = todayTransactions.reduce((sum, t) => sum + t.totalProfit, 0);
  const monthRevenue = monthTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const monthProfit = monthTransactions.reduce((sum, t) => sum + t.totalProfit, 0);

  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.costPrice * Math.max(0, p.stock),
    0
  );

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  // Build 7-day trend array
  const dailyTrend: {
    dateKey: string;
    label: string;
    revenue: number;
    profit: number;
    txCount: number;
  }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateKey = `${y}-${m}-${day}`;
    const label = d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
    });

    dailyTrend.push({
      dateKey,
      label,
      revenue: 0,
      profit: 0,
      txCount: 0,
    });
  }

  for (const tx of last7DaysTransactions) {
    const d = new Date(tx.createdAt);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    const bucket = dailyTrend.find((b) => b.dateKey === key);
    if (bucket) {
      bucket.revenue += tx.totalAmount;
      bucket.profit += tx.totalProfit;
      bucket.txCount += 1;
    }
  }

  return NextResponse.json({
    summary: {
      todayRevenue,
      todayProfit,
      todayTxCount: todayTransactions.length,
      monthRevenue,
      monthProfit,
      monthTxCount: monthTransactions.length,
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      totalInventoryValue,
    },
    dailyTrend,
    lowStockProducts: lowStockProducts.slice(0, 8),
    recentTransactions,
    topSelling: topSellingItems.map((item) => ({
      productName: item.productName,
      unit: item.unit,
      totalQty: item._sum.quantity || 0,
      totalRevenue: item._sum.subtotal || 0,
    })),
  });
}
