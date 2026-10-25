"use client";

import { useEffect, useState } from "react";
import { formatRupiah } from "@/lib/utils";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Tag,
  X,
  AlertTriangle,
  Loader2,
  Package,
  Download,
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
  category: Category | null;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Product Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [costPrice, setCostPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [minStock, setMinStock] = useState("5");
  const [saving, setSaving] = useState(false);

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  function openAddModal() {
    setEditingProduct(null);
    setName("");
    setSku("");
    setCategoryId(categories[0]?.id || "");
    setUnit("pcs");
    setCostPrice("");
    setSellPrice("");
    setStock("10");
    setMinStock("5");
    setModalOpen(true);
  }

  function openEditModal(p: Product) {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setCategoryId(p.categoryId || "");
    setUnit(p.unit);
    setCostPrice(String(p.costPrice));
    setSellPrice(String(p.sellPrice));
    setStock(String(p.stock));
    setMinStock(String(p.minStock));
    setModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sku,
          categoryId: categoryId || null,
          unit,
          costPrice: Number(costPrice) || 0,
          sellPrice: Number(sellPrice) || 0,
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 0,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchProducts();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(p: Product) {
    if (!confirm(`Hapus barang "${p.name}" dari daftar stok toko?`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      fetchProducts();
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName }),
    });
    if (res.ok) {
      setNewCategoryName("");
      fetchProducts();
    }
  }

  async function handleDeleteCategory(id: string) {
    await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    fetchProducts();
  }

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      selectedCategory === "ALL" || p.categoryId === selectedCategory;
    const matchLow = !onlyLowStock || p.stock <= p.minStock;
    return matchSearch && matchCat && matchLow;
  });

  const calculatedMargin =
    (Number(sellPrice) || 0) - (Number(costPrice) || 0);

  function handleExportStockCSV() {
    if (filteredProducts.length === 0) return;

    const headers = [
      "Kode SKU",
      "Nama Barang",
      "Kategori",
      "Satuan",
      "Harga Modal (Rp)",
      "Harga Jual (Rp)",
      "Margin Untung / Item (Rp)",
      "Stok Saat Ini",
      "Nilai Aset Modal (Rp)",
      "Status Stok",
    ];

    const rows = filteredProducts.map((p) => {
      const margin = p.sellPrice - p.costPrice;
      const assetVal = p.costPrice * Math.max(0, p.stock);
      const status =
        p.stock <= 0
          ? "HABIS"
          : p.stock <= p.minStock
          ? "STOK MENIPIS"
          : "AMAN";

      return [
        `"${p.sku}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category?.name || "Tanpa Kategori"}"`,
        `"${p.unit}"`,
        p.costPrice,
        p.sellPrice,
        margin,
        p.stock,
        assetVal,
        `"${status}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Laporan_Stok_Barang_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Master Data Barang & Harga
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Atur daftar produk, harga beli (modal), harga jual, serta batas minimum stok.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportStockCSV}
            disabled={filteredProducts.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setCatModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Tag className="w-4 h-4 text-slate-600" />
            <span>Kelola Kategori</span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama barang atau kode SKU..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition cursor-pointer ${
            onlyLowStock
              ? "bg-amber-100 border-amber-300 text-amber-900"
              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Stok Menipis</span>
        </button>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Memuat daftar barang...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Belum ada barang yang cocok</p>
            <p className="text-xs text-slate-500 mt-1">
              Klik tombol &quot;Tambah Barang Baru&quot; di kanan atas untuk menambahkan stok pertama Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                  <th className="py-3.5 px-4">Barang / SKU</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4 text-right">Harga Modal</th>
                  <th className="py-3.5 px-4 text-right">Harga Jual</th>
                  <th className="py-3.5 px-4 text-right">Untung / Item</th>
                  <th className="py-3.5 px-4 text-center">Stok Saat Ini</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.map((p) => {
                  const profit = p.sellPrice - p.costPrice;
                  const isLow = p.stock <= p.minStock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">Kode: {p.sku}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {p.category?.name || "Tanpa Kategori"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600">
                        {formatRupiah(p.costPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {formatRupiah(p.sellPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                        +{formatRupiah(profit)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            p.stock === 0
                              ? "bg-rose-100 text-rose-700"
                              : isLow
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                            title="Edit Barang"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Hapus Barang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? "Edit Data Barang" : "Tambah Barang Baru"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Nama Barang *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Beras Ramos 5kg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Kode SKU (Opsional)
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Otomatis jika kosong"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Kategori
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                  >
                    <option value="">-- Pilih --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Satuan Jual
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                  >
                    <option value="pcs">pcs</option>
                    <option value="bungkus">bungkus</option>
                    <option value="botol">botol</option>
                    <option value="pack">pack</option>
                    <option value="renceng">renceng</option>
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                    <option value="sak">sak</option>
                    <option value="dus">dus</option>
                    <option value="pouch">pouch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Harga Beli / Modal (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Harga Jual Konsumen (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="60000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">
                  Estimasi Keuntungan Bersih per {unit}:
                </span>
                <span className="font-bold text-sm text-emerald-700">
                  {formatRupiah(calculatedMargin)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                      Stok Awal
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                    />
                  </div>
                )}

                <div className={editingProduct ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Batas Peringatan Stok Menipis
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Barang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                Kelola Kategori Barang
              </h3>
              <button
                onClick={() => setCatModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="mt-4 flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nama kategori baru..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 cursor-pointer"
              >
                Tambah
              </button>
            </form>

            <div className="mt-4 divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="py-2.5 flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(c.id)}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

