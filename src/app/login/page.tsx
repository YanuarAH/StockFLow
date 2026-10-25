"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, LogIn, Sparkles, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk.");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError("");
    setDemoLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk ke akun demo.");
        setDemoLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Gagal menyiapkan akun demo.");
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Store className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl text-slate-900">StokUMKM</span>
        </Link>
        <h2 className="mt-5 text-center text-2xl font-bold text-slate-900">
          Masuk ke Dashboard Toko
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-600">
          Belum punya akun UMKM?{" "}
          <Link
            href="/register"
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Daftarkan Toko Baru
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs rounded-2xl border border-slate-200 sm:px-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Pemilik UMKM
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh@tokoanda.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm transition shadow-sm cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{loading ? "Memproses..." : "Masuk Sekarang"}</span>
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">
                  Atau Coba Langsung
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading || demoLoading}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-semibold text-sm transition cursor-pointer"
            >
              {demoLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-600" />
              )}
              <span>
                {demoLoading
                  ? "Menyiapkan Toko Demo..."
                  : "Masuk Akun Demo (Toko Berkah)"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

