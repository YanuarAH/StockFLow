"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { Printer, MessageCircle, X, Share2 } from "lucide-react";

export interface ReceiptItem {
  id?: string;
  productName: string;
  unit: string;
  quantity: number;
  costPrice?: number;
  sellPrice: number;
  subtotal: number;
}

export interface ReceiptTransaction {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  totalProfit?: number;
  paymentAmount: number;
  changeAmount: number;
  paymentMethod: string;
  customerName: string | null;
  createdAt: string;
  items: ReceiptItem[];
}

interface ThermalReceiptModalProps {
  transaction: ReceiptTransaction;
  storeName?: string;
  storeAddress?: string | null;
  storePhone?: string | null;
  cashierName?: string;
  onClose: () => void;
}

function formatNumberPlain(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default function ThermalReceiptModal({
  transaction,
  storeName = "TOKO UMKM BERKAH",
  storeAddress = "Jl. Merdeka Raya No. 45, Indonesia",
  storePhone = "0812-3456-7890",
  cashierName = "KASIR-01",
  onClose,
}: ThermalReceiptModalProps) {
  const [waPhone, setWaPhone] = useState("");
  const [showWaInput, setShowWaInput] = useState(false);

  const totalQty = transaction.items.reduce((s, i) => s + i.quantity, 0);

  function handleSendWhatsApp() {
    const lines = [
      `*${storeName.toUpperCase()}*`,
      storeAddress ? `${storeAddress}` : "",
      storePhone ? `Telp: ${storePhone}` : "",
      `================================`,
      `No. Nota : ${transaction.invoiceNumber}`,
      `Tanggal  : ${formatDateTime(transaction.createdAt)}`,
      `Kasir    : ${cashierName}`,
      `Pelanggan: ${transaction.customerName || "Umum"}`,
      `================================`,
      ...transaction.items.map(
        (item) =>
          `*${item.productName.toUpperCase()}*\n${item.quantity} ${item.unit} x ${formatNumberPlain(
            item.sellPrice
          )} = *Rp ${formatNumberPlain(item.subtotal)}*`
      ),
      `================================`,
      `Total Item : ${transaction.items.length} Jenis (${totalQty} Barang)`,
      `*TOTAL BELANJA : Rp ${formatNumberPlain(transaction.totalAmount)}*`,
      `Bayar (${transaction.paymentMethod === "CASH" ? "TUNAI" : transaction.paymentMethod}) : Rp ${formatNumberPlain(
        transaction.paymentAmount
      )}`,
      `Kembali    : Rp ${formatNumberPlain(transaction.changeAmount)}`,
      `================================`,
      `Terima kasih telah berbelanja di toko kami!`,
    ]
      .filter(Boolean)
      .join("\n");

    let cleanedPhone = waPhone.replace(/[^0-9]/g, "");
    if (cleanedPhone.startsWith("0")) {
      cleanedPhone = "62" + cleanedPhone.slice(1);
    }

    const url = cleanedPhone
      ? `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(lines)}`
      : `https://wa.me/?text=${encodeURIComponent(lines)}`;

    window.open(url, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-slate-300 my-auto">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 print:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pratinjau Struk Kasir Toko
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Paper (Minimarket / Swalayan Style for UMKM) */}
        <div
          id="thermal-receipt-paper"
          className="bg-white text-slate-900 font-mono text-[11px] leading-snug p-5 rounded-lg shadow-inner border border-slate-200 mx-auto max-w-[330px] print:shadow-none print:border-none print:max-w-full"
        >
          {/* Header Kop Toko */}
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm tracking-wide uppercase">
              {storeName}
            </p>
            {storeAddress && (
              <p className="text-[10px] text-slate-700 uppercase">
                {storeAddress}
              </p>
            )}
            {storePhone && (
              <p className="text-[10px] text-slate-700">
                TELP/WA: {storePhone}
              </p>
            )}
          </div>

          <div className="my-2 border-t border-dashed border-slate-400" />

          {/* Metadata Transaksi */}
          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>{formatDateTime(transaction.createdAt)}</span>
              <span>KSR: {cashierName.slice(0, 12).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>NO: {transaction.invoiceNumber}</span>
              <span>
                PLG: {(transaction.customerName || "UMUM").slice(0, 10).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="my-2 border-t border-dashed border-slate-400" />

          {/* Daftar Item Belanja */}
          <div className="space-y-2">
            {transaction.items.map((item, idx) => (
              <div key={item.id || idx}>
                <p className="font-bold uppercase truncate">
                  {item.productName}
                </p>
                <div className="flex justify-between text-[11px]">
                  <span className="pl-2">
                    {item.quantity} {item.unit.toUpperCase()} X{" "}
                    {formatNumberPlain(item.sellPrice)}
                  </span>
                  <span className="font-semibold">
                    {formatNumberPlain(item.subtotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="my-2.5 border-t border-dashed border-slate-400" />

          {/* Total & Pembayaran */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>TOTAL ITEM :</span>
              <span>
                {transaction.items.length} JENIS ({totalQty} BARANG)
              </span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-0.5">
              <span>TOTAL BELANJA :</span>
              <span>Rp {formatNumberPlain(transaction.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                BAYAR ({transaction.paymentMethod === "CASH" ? "TUNAI" : transaction.paymentMethod}) :
              </span>
              <span>Rp {formatNumberPlain(transaction.paymentAmount)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>KEMBALI :</span>
              <span>Rp {formatNumberPlain(transaction.changeAmount)}</span>
            </div>
          </div>

          <div className="my-2.5 border-t border-dashed border-slate-400" />

          {/* Footer Ucapan Terima Kasih */}
          <div className="text-center text-[10px] space-y-0.5 pt-1">
            <p className="font-bold">TERIMA KASIH ATAS KUNJUNGAN ANDA</p>
            <p>BARANG YANG SUDAH DIBELI TIDAK DAPAT</p>
            <p>DITUKAR ATAU DIKEMBALIKAN</p>
          </div>
        </div>

        {/* WhatsApp Input Box */}
        {showWaInput && (
          <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-200 space-y-2 print:hidden">
            <label className="block text-xs font-semibold text-slate-700">
              Nomor WhatsApp Pembeli (Opsional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-3 gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak Struk</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWaInput(!showWaInput)}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Kirim WA</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            <span>Selesai</span>
          </button>
        </div>
      </div>
    </div>
  );
}

