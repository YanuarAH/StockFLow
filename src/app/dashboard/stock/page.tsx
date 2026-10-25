"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  minStock: number;
  costPrice: number;
}

interface Movement {
  id: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  note: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
}

export default function StockPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"IN" | "ADJUST">("IN");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [newCostPrice, setNewCostPrice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/stock");
      const data = await res.json();
      setProducts(data.products || []);
      setMovements(data.movements || []);
      if (!selectedProductId && data.products?.length > 0) {
        setSelectedProductId(data.products[0].id);
        setNewCostPrice(String(data.products[0].costPrice));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentProduct = products.find((p) => p.id === selectedProductId);

  function handleSelectProduct(id: string) {
    setSelectedProductId(id);
    const found = products.find((p) => p.id === id);
    if (found) {
      setNewCostPrice(String(found.costPrice));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          type: mode,
          quantity: Number(quantity),
          newCostPrice: mode === "IN" ? Number(newCostPrice) : undefined,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Gagal menyimpan." });
      } else {
        setFeedback({
          type: "success",
          text:
            mode === "IN"
              ? "Stok kulakan berhasil ditambahkan!"
              : "Penyesuaian stok berhasil disimpan!",
        });
        setQuantity("");
        setNote("");
        loadData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Manajemen Stok Masuk & Opname
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Catat penambahan barang saat kulakan dari supplier atau sesuaikan stok fisik (barang rusak/hilang).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input Stok */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setMode("IN");
                setQuantity("");
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === "IN"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              + Stok Masuk (Kulakan)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("ADJUST");
                setQuantity("");
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === "ADJUST"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ± Opname / Barang Rusak
            </button>
          </div>

          {feedback && (
            <div
              className={`mb-4 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Pilih Barang *
              </label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Sisa: {p.stock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            {currentProduct && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">
                <span className="text-slate-600">Stok Saat Ini:</span>
                <span className="font-bold text-slate-900">
                  {currentProduct.stock} {currentProduct.unit} • Modal:{" "}
                  {formatRupiah(currentProduct.costPrice)}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                {mode === "IN"
                  ? `Jumlah Barang Masuk (${currentProduct?.unit || "pcs"}) *`
                  : "Jumlah Perubahan (Gunakan minus '-' untuk barang rusak/keluar) *"}
              </label>
              <input
                type="number"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={mode === "IN" ? "Contoh: 24" : "Contoh: -2 atau 5"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
              />
            </div>

            {mode === "IN" && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Harga Beli / Modal Terbaru per {currentProduct?.unit || "pcs"} (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newCostPrice}
                  onChange={(e) => setNewCostPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Catatan / Keterangan
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  mode === "IN"
                    ? "Misal: Kulakan dari Agen Grosir Makmur"
                    : "Misal: Kemasan bocor / kadaluarsa"
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedProductId}
              className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-sm transition cursor-pointer disabled:opacity-60 ${
                mode === "IN"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {submitting
                ? "Menyimpan..."
                : mode === "IN"
                ? "Simpan Stok Masuk"
                : "Simpan Penyesuaian Stok"}
            </button>
          </form>
        </div>

        {/* Kartu Stok (Riwayat Pergerakan Stok) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">
              Kartu Stok (Riwayat Keluar-Masuk Barang)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              100 catatan pergerakan stok terakhir di toko Anda secara real-time.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Memuat riwayat kartu stok...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-14 text-sm text-slate-500">
              Belum ada riwayat perubahan stok.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Barang</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4 text-center">Jumlah</th>
                    <th className="py-3 px-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">
                          {m.product?.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {m.product?.sku}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        {m.type === "IN" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            Masuk
                          </span>
                        )}
                        {m.type === "OUT" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Terjual
                          </span>
                        )}
                        {m.type === "ADJUST" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800">
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Opname
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-center font-bold ${
                          m.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}{" "}
                        {m.product?.unit}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {m.note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

