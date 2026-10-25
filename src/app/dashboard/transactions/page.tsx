"use client";

import { useEffect, useState } from "react";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import ThermalReceiptModal, {
  ReceiptTransaction,
} from "@/components/ThermalReceiptModal";
import {
  ReceiptText,
  Eye,
  Loader2,
  Search,
  Download,
  Calendar,
} from "lucide-react";

interface Transaction extends ReceiptTransaction {
  totalProfit: number;
}

interface StoreProfile {
  name: string;
  address: string | null;
  phone: string | null;
  cashierName: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>({
    name: "TOKO UMKM",
    address: null,
    phone: null,
    cashierName: "KASIR-01",
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"ALL" | "TODAY" | "7DAYS" | "MONTH">("ALL");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/transactions"), fetch("/api/store")])
      .then(async ([txRes, storeRes]) => {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);

        if (storeRes.ok) {
          const sData = await storeRes.json();
          setStoreProfile({
            name: sData.store?.name || "TOKO UMKM",
            address: sData.store?.address || null,
            phone: sData.store?.phone || null,
            cashierName: sData.session?.userName || "KASIR-01",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      tx.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (tx.customerName || "").toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    const txDate = new Date(tx.createdAt);
    if (periodFilter === "TODAY") return txDate >= startOfToday;
    if (periodFilter === "7DAYS") return txDate >= startOf7Days;
    if (periodFilter === "MONTH") return txDate >= startOfMonth;
    return true;
  });

  const totalOmzetFiltered = filtered.reduce((s, t) => s + t.totalAmount, 0);
  const totalProfitFiltered = filtered.reduce((s, t) => s + t.totalProfit, 0);
  const totalModalFiltered = totalOmzetFiltered - totalProfitFiltered;

  function handleExportCSV() {
    if (filtered.length === 0) return;

    const headers = [
      "No Nota",
      "Tanggal Transaksi",
      "Nama Pembeli",
      "Metode Pembayaran",
      "Rincian Barang",
      "Total Harga Modal (HPP)",
      "Total Omzet Penjualan",
      "Laba Bersih (Keuntungan)",
    ];

    const rows = filtered.map((tx) => {
      const itemSummary = tx.items
        .map((i) => `${i.productName} (${i.quantity} ${i.unit})`)
        .join("; ");
      const modal = tx.totalAmount - tx.totalProfit;
      const dateStr = formatDateTime(tx.createdAt);

      return [
        `"${tx.invoiceNumber}"`,
        `"${dateStr}"`,
        `"${tx.customerName || "Pelanggan Umum"}"`,
        `"${tx.paymentMethod}"`,
        `"${itemSummary.replace(/"/g, '""')}"`,
        modal,
        tx.totalAmount,
        tx.totalProfit,
      ].join(",");
    });

    // Add summary row at the bottom
    rows.push(
      [
        `"TOTAL KESELURUHAN (${filtered.length} NOTA)"`,
        `""`,
        `""`,
        `""`,
        `""`,
        totalModalFiltered,
        totalOmzetFiltered,
        totalProfitFiltered,
      ].join(",")
    );

    // UTF-8 BOM so Microsoft Excel reads Indonesian characters & columns cleanly
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Laporan_Pendapatan_${storeProfile.name.replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Riwayat Nota & Laporan Pendapatan
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Pantau seluruh nota kasir, cetak struk minimarket, atau unduh laporan keuangan ke Excel/CSV.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Laporan Excel / CSV</span>
        </button>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Total Omzet (Kotor)
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatRupiah(totalOmzetFiltered)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Dari {filtered.length} nota transaksi
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Total Harga Modal (HPP)
          </p>
          <p className="text-xl font-bold text-slate-700 mt-1">
            {formatRupiah(totalModalFiltered)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Modal barang yang terjual
          </p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <p className="text-xs font-semibold uppercase text-emerald-800">
            Total Laba Bersih (Untung)
          </p>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            +{formatRupiah(totalProfitFiltered)}
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Keuntungan bersih siap pakai
          </p>
        </div>
      </div>

      {/* Filter & Search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor nota (INV-...) atau nama pembeli..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Calendar className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
          {(
            [
              { id: "ALL", label: "Semua Waktu" },
              { id: "TODAY", label: "Hari Ini" },
              { id: "7DAYS", label: "7 Hari Terakhir" },
              { id: "MONTH", label: "Bulan Ini" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriodFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                periodFilter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Memuat riwayat transaksi...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Belum ada nota penjualan pada periode ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                  <th className="py-3.5 px-4">No. Nota</th>
                  <th className="py-3.5 px-4">Tanggal & Waktu</th>
                  <th className="py-3.5 px-4">Pembeli</th>
                  <th className="py-3.5 px-4">Metode</th>
                  <th className="py-3.5 px-4 text-right">Total Omzet</th>
                  <th className="py-3.5 px-4 text-right">Laba Bersih</th>
                  <th className="py-3.5 px-4 text-right">Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {tx.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {tx.customerName || "Pelanggan Umum"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {tx.paymentMethod === "CASH" ? "TUNAI" : tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                      {formatRupiah(tx.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                      +{formatRupiah(tx.totalProfit)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Struk</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Struk Swalayan */}
      {selectedTx && (
        <ThermalReceiptModal
          transaction={selectedTx}
          storeName={storeProfile.name}
          storeAddress={storeProfile.address}
          storePhone={storeProfile.phone}
          cashierName={storeProfile.cashierName}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
}
