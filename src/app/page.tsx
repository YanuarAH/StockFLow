import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  Store,
  PackageCheck,
  TrendingUp,
  ShoppingCart,
  ShieldCheck,
  BellRing,
  ArrowRight,
  CheckCircle2,
  Smartphone,
} from "lucide-react";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                StokUMKM
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                SaaS Multi-Toko
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
            >
              Daftar Toko Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-medium mb-6">
              <Smartphone className="w-4 h-4" />
              <span>Solusi Digital Praktis untuk Warung, Toko Kelontong & UMKM</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Kelola Stok Barang & Kasir UMKM{" "}
              <span className="text-emerald-600">Tanpa Ribet, Untung Terukur</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
              Tidak perlu lagi bingung barang habis atau lupa hitung keuntungan bersih.
              Setiap UMKM bisa mendaftarkan tokonya sendiri, mencatat stok masuk/keluar,
              melayani kasir cepat, dan memantau laba bersih harian langsung dari HP atau Laptop.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
              >
                <span>Buka Akun Toko Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition"
              >
                <span>Masuk / Coba Demo Instan</span>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Multi-UMKM (Data Terpisah & Aman)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Otomatis Hitung Laba Bersih
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Cetak Nota / Struk Kasir
              </span>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <PackageCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Manajemen Stok & Kulakan
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Catat harga modal (beli) dan harga jual. Pantau stok masuk saat kulakan,
                penyesuaian barang rusak/opname, beserta riwayat kartu stok lengkap.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Kasir Cepat (Point of Sale)
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Transaksi penjualan dalam hitungan detik. Stok barang otomatis berkurang,
                hitung uang kembalian otomatis, dan cetak struk belanja digital.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <BellRing className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Peringatan Stok Menipis
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Dapatkan pengingat otomatis di dashboard ketika stok barang di bawah batas
                minimum agar Anda tahu kapan harus belanja/kulakan kembali.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Laporan Omzet & Laba Bersih
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Bukan sekadar total uang masuk! Ketahui berapa keuntungan bersih Anda
                hari ini dan bulan ini setelah dikurangi harga modal barang.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Arsitektur Multi-UMKM (SaaS)
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Setiap pemilik UMKM memiliki akun dan ruang kerja toko sendiri yang
                terisolasi. Data produk dan keuangan dijamin aman.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Analitik Barang Terlaris
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Lihat daftar produk yang paling cepat laku terjual sehingga modal usaha
                Anda bisa diputar pada barang yang paling menguntungkan.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} StokUMKM — Platform Manajemen Stok & Penjualan UMKM Indonesia.</p>
      </footer>
    </div>
  );
}
