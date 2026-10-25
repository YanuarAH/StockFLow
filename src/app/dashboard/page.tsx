"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import {
  TrendingUp,
  Wallet,
  Package,
  AlertTriangle,
  ShoppingCart,
  ArrowRight,
  Award,
  ReceiptText,
  PlusCircle,
  Loader2,
  BarChart3,
} from "lucide-react";

interface DashboardData {
  summary: {
    todayRevenue: number;
    todayProfit: number;
    todayTxCount: number;
    monthRevenue: number;
    monthProfit: number;
    monthTxCount: number;
    totalProducts: number;
    lowStockCount: number;
    totalInventoryValue: number;
  };
  dailyTrend: {
    dateKey: string;
    label: string;
    revenue: number;
    profit: number;
    txCount: number;
  }[];
  lowStockProducts: {
    id: string;
    sku: string;
    name: string;
    stock: number;
    minStock: number;
    unit: string;
  }[];
  recentTransactions: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    totalProfit: number;
    paymentMethod: string;
    createdAt: string;
  }[];
  topSelling: {
    productName: string;
    unit: string;
    totalQty: number;
    totalRevenue: number;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        <span>Memuat ringkasan usaha Anda...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center">
        Gagal memuat data dashboard.
      </div>
    );
  }

  const {
    summary,
    dailyTrend = [],
    lowStockProducts,
    recentTransactions,
    topSelling,
  } = data;

  const maxRevenue = Math.max(...dailyTrend.map((d) => d.revenue), 100000);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Ringkasan Usaha & Stok
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Pantau omzet penjualan, keuntungan bersih, dan peringatan stok barang hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Tambah Barang</span>
          </Link>
          <Link
            href="/dashboard/pos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buka Kasir</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Omzet Hari Ini
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatRupiah(summary.todayRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Dari <span className="font-semibold text-slate-700">{summary.todayTxCount}</span> transaksi hari ini
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Laba Bersih Hari Ini
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-600">
            {formatRupiah(summary.todayProfit)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Bulan ini:{" "}
            <span className="font-semibold text-emerald-700">
              {formatRupiah(summary.monthProfit)}
            </span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nilai Aset Stok (Modal)
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatRupiah(summary.totalInventoryValue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Total <span className="font-semibold text-slate-700">{summary.totalProducts}</span> jenis barang terdaftar
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border shadow-xs ${
            summary.lowStockCount > 0
              ? "bg-amber-50/60 border-amber-300"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Peringatan Stok Menipis
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-700">
            {summary.lowStockCount} Barang
          </p>
          <p className="mt-1 text-xs text-amber-800">
            {summary.lowStockCount > 0
              ? "Segera lakukan kulakan / restock"
              : "Semua stok barang dalam batas aman"}
          </p>
        </div>
      </div>

      {/* 7-Day Revenue vs Profit Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="font-bold text-slate-900">
                Grafik Pendapatan & Laba Bersih (7 Hari Terakhir)
              </h2>
              <p className="text-xs text-slate-500">
                Perbandingan total uang masuk (omzet) dengan keuntungan bersih harian.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" />
              Omzet Penjualan
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
              Laba Bersih
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pt-6 px-1">
          {dailyTrend.map((day) => {
            const revHeight = Math.max(
              day.revenue > 0 ? Math.round((day.revenue / maxRevenue) * 100) : 4,
              4
            );
            const profHeight = Math.max(
              day.profit > 0 ? Math.round((day.profit / maxRevenue) * 100) : 4,
              4
            );
            return (
              <div
                key={day.dateKey}
                className="flex flex-col items-center h-full justify-end group relative"
              >
                {/* Hover Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -top-12 z-20 bg-slate-900 text-white text-[10px] rounded-lg py-1.5 px-2.5 whitespace-nowrap shadow-md">
                  <p className="font-bold">Omzet: {formatRupiah(day.revenue)}</p>
                  <p className="text-emerald-300">Laba: +{formatRupiah(day.profit)}</p>
                </div>

                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-32 border-b border-slate-200 pb-1">
                  <div
                    style={{ height: `${revHeight}%` }}
                    className={`w-3 sm:w-5 rounded-t-md transition-all ${
                      day.revenue > 0 ? "bg-blue-500" : "bg-slate-100"
                    }`}
                  />
                  <div
                    style={{ height: `${profHeight}%` }}
                    className={`w-3 sm:w-5 rounded-t-md transition-all ${
                      day.profit > 0 ? "bg-emerald-500" : "bg-slate-100"
                    }`}
                  />
                </div>
                <span className="mt-2 text-[11px] font-medium text-slate-600 truncate">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Low Stock Alert & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-slate-900">
                Barang Perlu Kulakan (Stok Menipis)
              </h2>
            </div>
            <Link
              href="/dashboard/stock"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              <span>Restock Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 flex-1">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">
                Semua stok barang masih mencukupi di atas batas minimum.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lowStockProducts.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        SKU: {item.sku} • Batas Min: {item.minStock} {item.unit}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.stock === 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      Sisa {item.stock} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900">Barang Paling Laris</h2>
            </div>
            <span className="text-xs text-slate-400">Berdasarkan Qty Terjual</span>
          </div>

          <div className="p-5 flex-1">
            {topSelling.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">
                Belum ada data penjualan. Mulai transaksi di menu Kasir.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topSelling.map((item, idx) => (
                  <div
                    key={item.productName}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.productName}
                        </p>
                        <p className="text-xs text-slate-500">
                          Omzet: {formatRupiah(item.totalRevenue)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      {item.totalQty} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900">Transaksi Penjualan Terakhir</h2>
          </div>
          <Link
            href="/dashboard/transactions"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
          >
            <span>Lihat Semua & Download Laporan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-500">
              Belum ada transaksi penjualan yang tercatat.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-500 bg-slate-50/50">
                  <th className="py-3 px-5">No. Nota</th>
                  <th className="py-3 px-5">Waktu</th>
                  <th className="py-3 px-5">Metode</th>
                  <th className="py-3 px-5 text-right">Total Belanja</th>
                  <th className="py-3 px-5 text-right">Laba Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-5 font-semibold text-slate-900">
                      {tx.invoiceNumber}
                    </td>
                    <td className="py-3 px-5 text-slate-600">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="py-3 px-5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right font-semibold text-slate-900">
                      {formatRupiah(tx.totalAmount)}
                    </td>
                    <td className="py-3 px-5 text-right font-semibold text-emerald-600">
                      +{formatRupiah(tx.totalProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
