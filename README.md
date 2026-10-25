# StockFlow — Platform SaaS Manajemen Stok Barang & Kasir (POS) UMKM

**StockFlow** adalah aplikasi web *Multi-Tenant (SaaS)* modern yang dirancang khusus untuk membantu pelaku UMKM (warung sembako, toko kelontong, minimarket lokal, dan ritel kecil) mengelola stok barang, mencatat kulakan/opname, melayani transaksi kasir cepat, mencetak struk bergaya minimarket (Indomaret/Alfamart), serta memantau laporan laba bersih secara *real-time*.

---

## Fitur Unggulan

1. **Arsitektur Multi-Tenant (SaaS Mandiri)**
   - Setiap pemilik UMKM dapat mendaftarkan akun dan tokonya sendiri (`/register`).
   - Seluruh data produk, kategori, kartu stok, dan transaksi penjualan terisolasi secara aman berdasarkan `storeId`.
2. **Dashboard Analitik & Peringatan Stok Menipis**
   - Pantau **Omzet Hari Ini**, **Laba Bersih (Keuntungan)**, dan **Total Nilai Aset Modal**.
   - **Grafik Tren 7 Hari Terakhir** yang membandingkan Omzet vs Laba Bersih harian.
   - **Low Stock Alert**: Indikator otomatis untuk barang yang stoknya mencapai batas minimum agar pemilik toko tahu kapan harus kulakan.
3. **Master Data Barang & Kalkulator Margin Otomatis**
   - Kelola SKU, kategori, satuan (`pcs`, `sak`, `renceng`, `botol`, `pouch`, dll), harga modal (beli), dan harga jual.
   - Kalkulasi margin keuntungan per barang secara otomatis dan fitur **Export Data Stok ke CSV/Excel**.
4. **Manajemen Stok Masuk (Kulakan) & Stock Opname**
   - Catat penambahan stok dari supplier disertai pembaruan harga modal terbaru.
   - Catat penyesuaian stok fisik (*stock opname*) untuk barang rusak/kedaluwarsa.
   - **Kartu Stok Real-Time**: Log audit lengkap untuk setiap pergerakan barang (`IN`, `OUT`, `ADJUST`).
5. **Kasir Cepat (Point of Sale) & Struk Minimarket Digital**
   - Katalog kasir interaktif dengan pencarian cepat, filter kategori, dan kalkulator uang kembalian otomatis.
   - **Struk Kasir Bergaya Indomaret/Alfamart**: Lengkap dengan kop toko dinamis, rincian item, metode bayar (`TUNAI`, `QRIS`, `TRANSFER`), rincian `DPP` & `PPN (Inklusif)`, fitur **Cetak Struk Thermal**, serta **Kirim Struk via WhatsApp**.
6. **Laporan Pendapatan & Export Excel/CSV**
   - Filter riwayat penjualan berdasarkan periode (*Hari Ini*, *7 Hari Terakhir*, *Bulan Ini*, *Semua Waktu*).
   - Unduh laporan keuangan lengkap (Omzet Kotor, HPP/Modal, dan Laba Bersih) ke format `.CSV` ber-encoding UTF-8 BOM yang langsung rapi saat dibuka di Microsoft Excel.

---

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Bahasa:** TypeScript
- **Styling & UI:** Tailwind CSS + Lucide Icons
- **Database & ORM:** PostgreSQL + [Prisma ORM](https://www.prisma.io/)
- **Autentikasi:** Supabase Auth dengan cookie session HTTP-only melalui `@supabase/ssr`

---

## Cara Menjalankan Proyek di Lokal

### 1. Prasyarat
- Node.js `v20.9+`
- Project Supabase dengan Auth dan PostgreSQL

### 2. Konfigurasi Supabase dan Environment
Buat `.env.local` di root project dan isi URL serta publishable key Supabase. `DATABASE_URL` adalah connection string PostgreSQL yang digunakan Prisma secara lokal. Vercel Supabase Integration menyediakan `POSTGRES_PRISMA_URL` untuk Prisma serta `SUPABASE_URL` dan `SUPABASE_PUBLISHABLE_KEY` untuk Auth; aplikasi menerima URL/key tersebut maupun pasangan `NEXT_PUBLIC_*`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

Di Supabase, tambahkan URL callback ke **Authentication → URL Configuration → Redirect URLs**:
- Lokal: `http://localhost:3000/auth/callback`
- Production: `https://<domain-vercel>/auth/callback`

Jika email confirmation diaktifkan, pengguna harus mengonfirmasi email sebelum masuk.

### 3. Instalasi & Sinkronisasi Database
```bash
npm install
npx prisma db push
```

### 4. Jalankan Server Development
```bash
npm run dev
```

Buka `http://localhost:3000` dan daftar melalui `/register`. Di Vercel, pastikan integrasi menyediakan `POSTGRES_PRISMA_URL`, `NEXT_PUBLIC_SUPABASE_URL`, dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Prisma menggunakan `POSTGRES_PRISMA_URL` dari integrasi terlebih dahulu, dengan `DATABASE_URL` sebagai fallback lokal. Untuk membuat tabel di database production, jalankan `npx prisma db push` dari lingkungan yang memiliki `DATABASE_URL` terisi dengan connection string Supabase. Semua URL database dan `SUPABASE_SECRET_KEY` harus dirahasiakan; gunakan hanya publishable key/anon key untuk Supabase Auth.
