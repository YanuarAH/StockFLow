import { runLocalAgent } from "../src/lib/agent/local";
import type { StoreSnapshot } from "../src/lib/agent/types";

const p = (name: string, unit: string, stock: number, min: number, cost: number, sell: number, s14: number, s30: number) => ({
  id: name, sku: "X", name, unit, stock, minStock: min, costPrice: cost, sellPrice: sell,
  sold14d: s14, sold30d: s30, profit30d: (sell - cost) * s30,
});

const snap: StoreSnapshot = {
  storeName: "Toko Berkah",
  today: { revenue: 142000, profit: 43000, txCount: 2 },
  week: { revenue: 900000, profit: 210000, txCount: 14 },
  month: { revenue: 3200000, profit: 800000, txCount: 55 },
  products: [
    p("Beras Ramos Premium 5kg", "sak", 18, 5, 64000, 72000, 14, 30),
    p("Minyak Goreng Tropical 2L", "pouch", 4, 10, 31500, 36000, 28, 60),
    p("Indomie Goreng Spesial", "bungkus", 85, 20, 2700, 3500, 70, 150),
    p("Kopi Kapal Api Special Mix", "renceng", 3, 6, 12500, 15000, 10, 20),
    p("Sabun Cuci Piring Sunlight 650ml", "pouch", 2, 5, 11000, 14000, 0, 0),
  ],
};

const tests = [
  "halo", "bisa bantu apa aja?", "untung hari ini berapa?", "omzet minggu ini gimana",
  "stok beras tinggal berapa?", "stok indomi goreng masih ada ga",
  "mau tambah minyak goreng merek sunco", "tambahin minyk grg sunko 20 pouch",
  "indomie goreng 2 dus", "kulakan beras ramos 10 sak total 650.000",
  "barang apa yang perlu dikulakan?", "apa yang paling laku?", "yang belum laku apa aja",
  "kopi modal 12.500 enaknya dijual berapa?", "buatkan excel daftar belanja barang yang menipis",
  "gimana kondisi toko saya", "makasih ya", "asdfgh",
];

for (const t of tests) {
  const r = runLocalAgent(t, [], snap);
  const cards = [r.stockInDraft && `draft(${r.stockInDraft.map((d) => `${d.matchedProductName}${d.matchedProductId ? "" : "*"} x${d.qty} @${d.unitCost}`).join("; ")})`, r.anomalies && `anomali(${r.anomalies.length})`, r.excelPayload && "excel"].filter(Boolean).join(" ");
  console.log(`\n> ${t}\n  ${r.reply.split("\n")[0].slice(0, 150)}${cards ? `\n  [${cards}]` : ""}`);
}

