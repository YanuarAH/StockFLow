// Pengetahuan produk UMKM Indonesia + normalisasi bahasa obrolan sehari-hari.
// Dipakai agar chat bebas seperti "mau tambah minyak goreng merek sunco" tetap dipahami.

export const STOP_WORDS = new Set([
  "halo", "hai", "hei", "min", "kak", "pak", "bu", "bos", "ai", "tolong",
  "bantu", "bantuin", "bisa", "minta", "saya", "aku", "kita", "kami", "mau",
  "ingin", "pengen", "hendak", "akan", "udah", "sudah", "baru", "saja", "aja",
  "dong", "deh", "ya", "yaa", "nih", "tuh", "itu", "ini", "yang", "yg",
  "untuk", "buat", "ke", "di", "dari", "sama", "dengan", "dgn", "tambah",
  "tambahkan", "tambahin", "nambah", "nambahin", "masukkan", "masukin",
  "input", "inputin", "catat", "catatin", "stok", "stock", "barang", "produk",
  "item", "masuk", "kulakan", "restock", "restok", "beli", "belanja", "order",
  "pesan", "datang", "sampai", "kiriman", "supplier", "suplier", "agen",
  "distributor", "grosir", "toko", "warung", "gudang", "merek", "merk",
  "brand", "cap", "tipe", "jenis", "varian", "ukuran", "sebanyak", "sejumlah",
  "sebesar", "sekitar", "ada", "punya", "harga", "harganya", "modal",
  "modalnya", "belinya", "satuan", "satuannya", "per", "total", "totalnya",
  "senilai", "seharga", "rp", "rupiah", "perak", "lagi", "tadi", "barusan",
]);

export const TYPO_DICTIONARY: Record<string, string> = {
  indomi: "Indomie", indomei: "Indomie", indomie: "Indomie",
  sarimi: "Sarimi", sedap: "Sedaap", sedaap: "Sedaap",
  minyk: "Minyak", mnyak: "Minyak", minyak: "Minyak", miyak: "Minyak",
  grg: "Goreng", goreng: "Goreng", gorng: "Goreng",
  sunko: "Sunco", sunco: "Sunco", bimoli: "Bimoli",
  tropikal: "Tropical", tropical: "Tropical", filma: "Filma",
  fortune: "Fortune", sania: "Sania", gulaku: "Gulaku", gula: "Gula",
  psir: "Pasir", pasir: "Pasir", brs: "Beras", beras: "Beras", bras: "Beras",
  ramos: "Ramos", pandan: "Pandan", wangi: "Wangi", rojolele: "Rojolele",
  kapal: "Kapal", api: "Api", kapalapi: "Kapal Api", abc: "ABC",
  goodday: "Good Day", luwak: "Luwak", pucuk: "Pucuk", harum: "Harum",
  teh: "Teh", sosro: "Sosro", aqua: "Aqua", sunlight: "Sunlight",
  sanlight: "Sunlight", sunlig: "Sunlight", mama: "Mama", lemon: "Lemon",
  rinso: "Rinso", daia: "Daia", soklin: "So Klin", molto: "Molto",
  lifebuoy: "Lifebuoy", lifeboy: "Lifebuoy", pepsodent: "Pepsodent",
  pepsoden: "Pepsodent", telur: "Telur", telor: "Telur", tlor: "Telur",
  terigu: "Terigu", segitiga: "Segitiga", bogasari: "Bogasari",
  kecap: "Kecap", bango: "Bango", saus: "Saus", saos: "Saus",
  sambal: "Sambal", garam: "Garam", kopi: "Kopi", susu: "Susu",
};

const KNOWLEDGE_BASE: { keywords: string[]; unit: string; cost: number; category: string }[] = [
  // Sembako
  { keywords: ["minyak", "sunco", "bimoli", "tropical", "fortune", "filma", "sania"], unit: "pouch", cost: 32000, category: "Sembako" },
  { keywords: ["beras", "ramos", "rojolele", "pandan", "cianjur"], unit: "kg", cost: 13000, category: "Sembako" },
  { keywords: ["gula", "gulaku"], unit: "kg", cost: 16000, category: "Sembako" },
  { keywords: ["telur", "telor"], unit: "kg", cost: 26000, category: "Sembako" },
  { keywords: ["terigu", "segitiga", "bogasari", "cakra"], unit: "kg", cost: 12000, category: "Sembako" },
  { keywords: ["garam"], unit: "bungkus", cost: 4000, category: "Sembako" },
  { keywords: ["santan", "kara"], unit: "pcs", cost: 5000, category: "Sembako" },

  // Makanan Ringan / Mie
  { keywords: ["indomie", "mie", "sarimi", "sedaap", "supermi"], unit: "bungkus", cost: 2800, category: "Makanan Ringan" },
  { keywords: ["chitato", "lays", "cheetos", "keripik", "chiki"], unit: "pcs", cost: 6000, category: "Makanan Ringan" },
  { keywords: ["roma", "biskuit", "wafer", "oreo", "nextar", "sari gandum", "regal"], unit: "pcs", cost: 5000, category: "Makanan Ringan" },
  { keywords: ["beng beng", "silverqueen", "coklat", "cokelat", "cadbury", "kit kat", "kitkat"], unit: "pcs", cost: 5000, category: "Makanan Ringan" },
  { keywords: ["permen", "kopiko", "mentos", "relaxa", "yupi"], unit: "pcs", cost: 1500, category: "Makanan Ringan" },

  // Minuman
  { keywords: ["kopi", "kapal api", "good day", "luwak", "torabika", "nescafe", "abc mix"], unit: "renceng", cost: 13000, category: "Minuman" },
  { keywords: ["teh", "pucuk", "sosro", "tong tji", "sari wangi"], unit: "botol", cost: 3000, category: "Minuman" },
  { keywords: ["aqua", "minerale", "air mineral", "pristine", "ades", "cleo"], unit: "botol", cost: 3500, category: "Minuman" },
  { keywords: ["susu", "ultra", "frisian", "indomilk", "milo", "dancow", "bear brand"], unit: "pcs", cost: 5000, category: "Minuman" },
  { keywords: ["nutrisari", "marimas", "pop ice", "ale ale"], unit: "renceng", cost: 6000, category: "Minuman" },

  // Bumbu Dapur
  { keywords: ["royco", "masako", "sasa", "penyedap", "kaldu", "micin", "vetsin"], unit: "renceng", cost: 5000, category: "Bumbu Dapur" },
  { keywords: ["kecap", "bango", "abc kecap", "sedaap kecap"], unit: "pcs", cost: 5000, category: "Bumbu Dapur" },
  { keywords: ["saus", "saos", "sambal", "del monte", "abc sambal"], unit: "botol", cost: 6000, category: "Bumbu Dapur" },
  { keywords: ["lada", "merica", "ketumbar", "kunyit", "jahe", "bumbu racik"], unit: "pcs", cost: 2000, category: "Bumbu Dapur" },

  // Kebutuhan Rumah
  { keywords: ["sunlight", "mama lemon", "cuci piring"], unit: "pcs", cost: 11000, category: "Kebutuhan Rumah" },
  { keywords: ["rinso", "daia", "attack", "deterjen", "detergen", "so klin", "soklin"], unit: "pcs", cost: 10000, category: "Kebutuhan Rumah" },
  { keywords: ["sabun mandi", "lifebuoy", "lux", "nuvo", "dettol"], unit: "pcs", cost: 4000, category: "Kebutuhan Rumah" },
  { keywords: ["shampoo", "shampo", "sampo", "clear", "pantene", "sunsilk", "head"], unit: "renceng", cost: 6000, category: "Kebutuhan Rumah" },
  { keywords: ["pepsodent", "pasta gigi", "odol", "formula", "closeup"], unit: "pcs", cost: 8000, category: "Kebutuhan Rumah" },
  { keywords: ["tissue", "tisu", "paseo", "nice", "jolly"], unit: "pcs", cost: 5000, category: "Kebutuhan Rumah" },
  { keywords: ["sapu", "pel", "ember", "gayung", "plastik", "kantong"], unit: "pcs", cost: 10000, category: "Kebutuhan Rumah" },

  // Obat Warung / Kesehatan
  { keywords: ["bodrex", "panadol", "paracetamol", "paramex", "obat sakit", "obat pusing"], unit: "strip", cost: 5000, category: "Obat & Kesehatan" },
  { keywords: ["tolak angin", "antangin", "obat masuk angin"], unit: "pcs", cost: 3000, category: "Obat & Kesehatan" },
  { keywords: ["promag", "mylanta", "obat maag"], unit: "strip", cost: 4000, category: "Obat & Kesehatan" },
  { keywords: ["minyak kayu putih", "cap lang", "telon", "balsem", "geliga"], unit: "botol", cost: 12000, category: "Obat & Kesehatan" },
  { keywords: ["hansaplast", "plester", "betadine", "minyak angin"], unit: "pcs", cost: 5000, category: "Obat & Kesehatan" },
  { keywords: ["masker", "hand sanitizer", "kapas"], unit: "pcs", cost: 5000, category: "Obat & Kesehatan" },

  // Rokok & Gas
  { keywords: ["rokok", "sampoerna", "djarum", "gudang garam", "surya", "marlboro", "dunhill", "class mild", "magnum"], unit: "bungkus", cost: 25000, category: "Rokok" },
  { keywords: ["korek", "tokai", "korek api", "lighter"], unit: "pcs", cost: 2000, category: "Rokok" },
  { keywords: ["gas", "elpiji", "lpg", "melon"], unit: "tabung", cost: 18000, category: "Gas & Galon" },
  { keywords: ["galon", "air galon"], unit: "galon", cost: 5000, category: "Gas & Galon" },
];

export const KNOWN_BRANDS = [
  "sunco", "tropical", "bimoli", "filma", "fortune", "sania", "ramos",
  "rojolele", "gulaku", "kapal api", "good day", "luwak", "indomie",
  "sedaap", "sarimi", "pucuk", "sosro", "aqua", "minerale", "sunlight",
  "mama lemon", "rinso", "daia", "lifebuoy", "pepsodent", "bango",
];

const WORD_NUMBERS: Record<string, number> = {
  sebuah: 1, sebiji: 1, sebungkus: 1, sebotol: 1, sesak: 1, sekarung: 1,
  sedus: 1, sepaket: 1, serenceng: 1, sekilo: 1, seliter: 1, satu: 1,
  dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8,
  sembilan: 9, sepuluh: 10, sebelas: 11, selusin: 12, duabelas: 12,
  limabelas: 15, duapuluh: 20, tigapuluh: 30, empatpuluh: 40, limapuluh: 50,
  seratus: 100,
};

export function normalizeText(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function toTitleCase(tokens: string[]): string {
  return tokens
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase();
      if (TYPO_DICTIONARY[lower]) return TYPO_DICTIONARY[lower];
      if (/^\d+(kg|gr|ml|l|liter)$/i.test(w)) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();
}

export function cleanProductName(raw: string): {
  cleanName: string;
  inferredUnit: string;
  inferredCost: number;
  inferredCategory: string;
} {
  const tokens = raw
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t.toLowerCase()));

  const cleanName = toTitleCase(tokens);
  const lower = cleanName.toLowerCase();
  const kb = KNOWLEDGE_BASE.find((k) => k.keywords.some((kw) => lower.includes(kw)));

  return {
    cleanName,
    inferredUnit: kb?.unit ?? "pcs",
    inferredCost: kb?.cost ?? 0,
    inferredCategory: kb?.category ?? "",
  };
}

function bigrams(str: string): Set<string> {
  const s = normalizeText(str).replace(/\s+/g, "");
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

export function calculateSimilarity(rawInput: string, targetName: string): number {
  const a = normalizeText(rawInput);
  const b = normalizeText(targetName);
  if (!a || !b) return 0;
  if (a === b) return 100;

  // Merek berbeda = produk berbeda (Sunco != Tropical)
  const ba = KNOWN_BRANDS.filter((x) => a.includes(x));
  const bb = KNOWN_BRANDS.filter((x) => b.includes(x));
  if (ba.length && bb.length && !ba.some((x) => bb.includes(x))) return 15;

  if (b.includes(a) || a.includes(b)) return 88;

  const ta = a.split(" ").filter((t) => t.length > 1);
  const tb = b.split(" ").filter((t) => t.length > 1);
  const hit = ta.filter((t) => tb.some((u) => u.includes(t) || t.includes(u))).length;
  const tokenScore = ta.length ? (hit / ta.length) * 100 : 0;

  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  const dice = A.size + B.size ? ((2 * inter) / (A.size + B.size)) * 100 : 0;

  return Math.round(tokenScore * 0.65 + dice * 0.35);
}

function parseMoney(raw: string): number {
  const c = raw.toLowerCase().trim();
  if (/(rb|ribu|k)$/.test(c)) {
    const n = parseFloat(c.replace(/rb|ribu|k/g, "").replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : Math.round(n * 1000);
  }
  return parseInt(c.replace(/[.,]/g, ""), 10) || 0;
}

export interface RawStockItem {
  rawName: string;
  qty: number;
  unitCost: number;
  unit: string;
}

export function extractStockItems(text: string): RawStockItem[] {
  const segments = text
    .split(/\n|;|,|\s+dan\s+|\s+sama\s+|\s+terus\s+|\s+lalu\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  const out: RawStockItem[] = [];

  for (const seg of segments) {
    const isTotal = /\btotal(?:nya)?\b/i.test(seg);
    let work = seg;
    let price = 0;

    const explicit = work.match(
      /(?:@|harga(?:nya)?|modal(?:nya)?|total(?:nya)?|rp\.?|senilai|seharga)\s*([0-9][0-9.,]*(?:\s*(?:rb|ribu|k))?)/i
    );
    if (explicit) {
      price = parseMoney(explicit[1]);
      work = work.replace(explicit[0], " ");
    } else {
      const trailing = work.match(/\b([0-9]+(?:[.,][0-9]{3})+|[0-9]{4,}|[0-9]+\s*(?:rb|ribu|k))\b/i);
      if (trailing) {
        price = parseMoney(trailing[1]);
        work = work.replace(trailing[0], " ");
      }
    }

    const noPack = work.replace(/\b\d+(?:kg|gr|gram|mg|ml|l|liter)\b/gi, " ");
    let qty = 0;
    let unit = "";

    const um = noPack.match(
      /\b(\d+)\s*(pcs|bungkus|bks|botol|btl|pack|pak|renceng|rcg|sak|karung|dus|box|karton|pouch|buah|biji|lusin|kaleng|galon|kg|kilo|liter|ltr)\b/i
    );
    if (um) {
      qty = parseInt(um[1], 10);
      unit = um[2].toLowerCase();
      work = work.replace(um[0], " ");
    } else {
      const nums = [...noPack.matchAll(/\b(\d{1,3})\b/g)];
      if (nums.length) {
        const last = nums[nums.length - 1];
        qty = parseInt(last[1], 10);
        work = work.replace(last[0], " ");
      } else {
        for (const [word, val] of Object.entries(WORD_NUMBERS)) {
          const re = new RegExp(`\\b${word}\\b`, "i");
          if (re.test(work)) {
            qty = val;
            work = work.replace(re, " ");
            break;
          }
        }
      }
    }

    const { cleanName, inferredUnit, inferredCost } = cleanProductName(work);
    if (cleanName.length < 2) continue;

    const finalQty = qty > 0 ? qty : 10;
    const unitCost = price > 0 ? (isTotal ? Math.round(price / finalQty) : price) : inferredCost;

    out.push({ rawName: cleanName, qty: finalQty, unitCost, unit: unit || inferredUnit });
  }

  return out;
}

export function formatIDR(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

