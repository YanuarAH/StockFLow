"use client";

import { useEffect, useState } from "react";
import { formatRupiah } from "@/lib/utils";
import ThermalReceiptModal, {
  ReceiptTransaction,
} from "@/components/ThermalReceiptModal";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface StoreProfile {
  name: string;
  address: string | null;
  phone: string | null;
  cashierName: string;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>({
    name: "TOKO UMKM",
    address: null,
    phone: null,
    cashierName: "KASIR-01",
  });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS" | "TRANSFER">("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [receipt, setReceipt] = useState<ReceiptTransaction | null>(null);

  async function loadProducts() {
    setLoading(true);
    try {
      const [prodRes, storeRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/store"),
      ]);
      const data = await prodRes.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);

      if (storeRes.ok) {
        const sData = await storeRes.json();
        setStoreProfile({
          name: sData.store?.name || "TOKO UMKM",
          address: sData.store?.address || null,
          phone: sData.store?.phone || null,
          cashierName: sData.session?.userName || "KASIR-01",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function addToCart(product: Product) {
    if (product.stock <= 0) return;
    setError("");
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty > item.product.stock) return item;
          return { ...item, quantity: nextQty };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  const totalAmount = cart.reduce(
    (sum, i) => sum + i.product.sellPrice * i.quantity,
    0
  );

  const numericPayment =
    paymentMethod === "CASH" ? Number(paymentAmount) || 0 : totalAmount;
  const changeAmount = numericPayment - totalAmount;

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    setError("");

    if (paymentMethod === "CASH" && numericPayment < totalAmount) {
      setError("Uang pembayaran kurang dari total belanja.");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
          paymentMethod,
          paymentAmount: numericPayment,
          customerName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memproses transaksi.");
        setProcessing(false);
        return;
      }

      setReceipt(data.transaction);
      setCart([]);
      setPaymentAmount("");
      setCustomerName("");
      loadProducts();
    } catch {
      setError("Terjadi kesalahan saat memproses pembayaran.");
    } finally {
      setProcessing(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === "ALL" || p.categoryId === selectedCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Product Catalog */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang atau scan SKU..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 gap-2 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Memuat katalog barang...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((c) => c.product.id === p.id);
                const outOfStock = p.stock <= 0;
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={outOfStock ? -1 : 0}
                    onClick={() => !outOfStock && addToCart(p)}
                    onKeyDown={(e) => {
                      if (!outOfStock && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        addToCart(p);
                      }
                    }}
                    className={`text-left p-3.5 sm:p-4 rounded-2xl border transition flex flex-col justify-between group select-none ${
                      outOfStock
                        ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed"
                        : inCart
                        ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs cursor-pointer"
                        : "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-xs cursor-pointer"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-slate-400 truncate">
                            {p.sku}
                          </p>
                          <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mt-0.5 leading-snug">
                            {p.name}
                          </h3>
                        </div>

                        {/* Kontrol Qty / Minus Cepat Langsung di Kartu Item */}
                        {inCart ? (
                          <div
                            className="shrink-0 flex items-center bg-white rounded-xl border border-emerald-300 shadow-2xs p-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              title="Kurangi / Hapus dari keranjang"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQty(p.id, -1);
                              }}
                              className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition active:scale-90 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <span className="min-w-6 px-1 text-center text-xs font-black text-emerald-800">
                              {inCart.quantity}
                            </span>
                            <button
                              type="button"
                              title="Tambah 1 lagi"
                              disabled={inCart.quantity >= p.stock}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(p);
                              }}
                              className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-90 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition ${
                              outOfStock
                                ? "bg-slate-200 text-slate-400"
                                : "bg-slate-100 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white"
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-sm text-emerald-700">
                        {formatRupiah(p.sellPrice)}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          outOfStock
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {outOfStock ? "Habis" : `${p.stock} ${p.unit}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Shopping Cart & Checkout */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sticky top-20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900">Keranjang Kasir</h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
              >
                Kosongkan
              </button>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Belum ada barang dipilih. Klik barang di sebelah kiri untuk menambahkan.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto my-3 pr-1">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="py-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatRupiah(item.product.sellPrice)} / {item.product.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQty(item.product.id, -1)}
                      className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.product.id, 1)}
                      className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateQty(item.product.id, -item.quantity)
                      }
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg ml-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Checkout Form */}
          <form onSubmit={handleCheckout} className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">
                Total Tagihan
              </span>
              <span className="text-2xl font-extrabold text-emerald-600">
                {formatRupiah(totalAmount)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["CASH", "QRIS", "TRANSFER"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      paymentMethod === m
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {m === "CASH" ? "TUNAI" : m}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "CASH" && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Uang Diterima (Rp)
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={String(totalAmount)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(totalAmount))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    Uang Pas
                  </button>
                  {[20000, 50000, 100000].map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setPaymentAmount(String(nom))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      {formatRupiah(nom)}
                    </button>
                  ))}
                </div>

                {numericPayment >= totalAmount && totalAmount > 0 && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs">
                    <span className="font-medium text-emerald-800">
                      Uang Kembalian:
                    </span>
                    <span className="font-bold text-sm text-emerald-700">
                      {formatRupiah(changeAmount)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama Pembeli (Opsional)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={cart.length === 0 || processing}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-sm cursor-pointer"
            >
              {processing ? "Memproses Nota..." : "Bayar & Cetak Struk Minimarket"}
            </button>
          </form>
        </div>
      </div>

      {/* Indomaret / Alfamart Thermal Receipt Modal */}
      {receipt && (
        <ThermalReceiptModal
          transaction={receipt}
          storeName={storeProfile.name}
          storeAddress={storeProfile.address}
          storePhone={storeProfile.phone}
          cashierName={storeProfile.cashierName}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
