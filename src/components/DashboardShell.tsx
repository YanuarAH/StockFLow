"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ArrowDownUp,
  ReceiptText,
  Settings,
  LogOut,
  Store,
  User,
  Boxes,
  ArrowLeftRight,
  Sparkles,
} from "lucide-react";

interface DashboardShellProps {
  children: React.ReactNode;
  storeName: string;
  userName: string;
}

// Menu khusus Mode Manajemen Stok & Gudang (Bebas dari tombol kasir yang memenuhi layar)
const stockNavItems = [
  {
    href: "/dashboard",
    label: "Ringkasan Stok & Usaha",
    desc: "Analitik & Alert Stok",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/products",
    label: "Master Data Barang",
    desc: "SKU, Modal & Harga Jual",
    icon: Package,
  },
  {
    href: "/dashboard/stock",
    label: "Stok Masuk & Opname",
    desc: "Kulakan & Kartu Stok",
    icon: ArrowDownUp,
  },
  {
    href: "/dashboard/assistant",
    label: "Asisten AI Gudang",
    desc: "Agentic Stock-In & Excel",
    icon: Sparkles,
  },
  {
    href: "/dashboard/transactions",
    label: "Laporan & Riwayat Nota",
    desc: "Omzet, HPP & Export CSV",
    icon: ReceiptText,
  },
  {
    href: "/dashboard/settings",
    label: "Pengaturan Profil Toko",
    desc: "Identitas & Kop Struk",
    icon: Settings,
  },
];

// Label ringkas untuk navigasi bawah di HP agar tidak terpotong
const SHORT_LABELS: Record<string, string> = {
  "/dashboard": "Ringkasan",
  "/dashboard/products": "Barang",
  "/dashboard/stock": "Stok",
  "/dashboard/assistant": "Asisten",
  "/dashboard/transactions": "Laporan",
  "/dashboard/settings": "Toko",
};

export default function DashboardShell({
  children,
  storeName,
  userName,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Otomatis mendeteksi apakah pengguna sedang berada di Mode Kasir (/dashboard/pos)
  const isCashierMode = pathname.startsWith("/dashboard/pos");

  async function handleLogout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      throw new Error("Gagal mengakhiri sesi. Silakan coba lagi.");
    }
    router.push("/login");
  }

  function switchMode(target: "STOCK" | "POS") {
    if (target === "POS") {
      router.push("/dashboard/pos");
    } else {
      router.push("/dashboard");
    }
  }

  // ============================================================================
  // TAMPILAN 1: MODE KASIR FOKUS (LAYAR PENUH, BERSIH, BEBAS GANGGUAN MENU STOK)
  // ============================================================================
  if (isCashierMode) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        {/* Topbar Khusus Kasir */}
        <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            {/* Store Info & Active Mode Badge */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-xs">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-sm sm:text-base text-white truncate">
                    {storeName}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Mode Kasir Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate hidden sm:block">
                  Kasir Bertugas: <span className="text-slate-200 font-medium">{userName}</span>
                </p>
              </div>
            </div>

            {/* Center / Right Mode Switcher & Quick Links */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mode Switcher Pill */}
              <div className="hidden md:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => switchMode("STOCK")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Mode Stok Barang</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 shadow-xs cursor-default"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Mode Kasir (POS)</span>
                </button>
              </div>

              {/* Mobile / Compact Back to Stock Mode Button */}
              <button
                type="button"
                onClick={() => switchMode("STOCK")}
                className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Ke Mode Stok</span>
              </button>

              <Link
                href="/dashboard/transactions"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                title="Lihat Riwayat Nota & Cetak Ulang Struk"
              >
                <ReceiptText className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Riwayat Nota</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                title="Keluar Akun"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {/* Full-Width Cashier Workspace */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    );
  }

  // ============================================================================
  // TAMPILAN 2: MODE MANAJEMEN STOK & ADMIN (FOKUS INVENTORI, GUDANG & LAPORAN)
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
        {/* Brand & Store Info */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-slate-900 truncate">
              {storeName}
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
              <Boxes className="w-3 h-3" />
              Mode Manajemen Stok
            </span>
          </div>
        </div>

        {/* Mode Switcher Card inside Sidebar */}
        <div className="p-3.5 pb-1">
          <div className="p-1 bg-slate-100 rounded-xl grid grid-cols-2 gap-1 border border-slate-200/80">
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold bg-white text-emerald-700 shadow-2xs cursor-default"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Stok Barang</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("POS")}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mode Kasir</span>
            </button>
          </div>
        </div>

        {/* Navigation Links (Hanya Menu Stok & Laporan) */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Pengelolaan Stok
          </p>
        </div>

        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {stockNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition group ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-emerald-600"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">
                    {item.label}
                  </p>
                  <p
                    className={`text-[11px] truncate mt-0.5 ${
                      isActive ? "text-emerald-100" : "text-slate-400"
                    }`}
                  >
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3.5 border-t border-slate-100">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-500">Pemilik Usaha</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Keluar Akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header (Mode Stok) */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs text-slate-900 truncate">
              {storeName}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold">
              Mode Stok Barang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => switchMode("POS")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mode Kasir</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-rose-600 bg-rose-50"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area (Mode Stok) */}
      <div className="flex-1 lg:pl-72 pb-20 lg:pb-8">
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Mobile Bottom Navigation (Menu Stok & AI Gudang) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid grid-cols-6 py-1.5 px-1">
        {stockNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-medium ${
                isActive ? "text-emerald-600 font-bold" : "text-slate-500"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-full px-0.5">
                {SHORT_LABELS[item.href] ?? item.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
