import {
  extractStockItems,
  formatIDR,
  normalizeText,
  TYPO_DICTIONARY,
} from "./knowledge";
import {
  buildAnomalies,
  buildProfitExcel,
  buildPurchaseOrder,
  buildStockInDraft,
} from "./tools";
import type {
  AgentResult,
  ChatTurn,
  PeriodTotals,
  ProductSnapshot,
  StoreSnapshot,
} from "./types";

const DEFAULT_SUGGESTIONS = [
  "List barang yang ada di toko",
  "Barang apa yang sebaiknya ditambahkan?",
  "Barang apa yang perlu dikulakan?",
  "Gimana cara meningkatkan omzet toko?",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function roundTo500(n: number): number {
  return Math.round(n / 500) * 500;
}

const QUERY_CLEANUP_WORDS = new Set([
  "berapa", "brp", "apakah", "apa", "gimana", "bagaimana", "ada", "punya",
  "tolong", "bantu", "cek", "lihat", "tampilkan", "kasih", "tau", "tahu",
  "stok", "stock", "stoknya", "stokku", "sisa", "sisanya", "tinggal", "harga", "harganya", "modal", "modalnya", "jual", "jualnya",
  "dong", "deh", "ya", "yaa", "nih", "tuh", "itu", "ini", "yang", "yg",
  "di", "ke", "dari", "dan", "atau", "pada", "untuk", "buat", "saya", "kamu",
  "toko", "warung", "gudang", "barang", "barangnya", "produk", "produknya", "item", "sekarang", "saat",
  "kira", "kira2", "coba", "mohon", "gak", "nggak", "tidak", "kah", "bisa",
  "kalau", "kalo", "klo", "kl", "terus", "lalu", "juga", "jg", "sih"
]);

export function extractQueryItemName(raw: string): string | null {
  const norm = normalizeText(raw);
  const words = norm.split(" ").filter(Boolean);
  const filtered = words.filter((w) => !QUERY_CLEANUP_WORDS.has(w) && !/^\d+$/.test(w) && w.length >= 3);
  if (!filtered.length) return null;
  return filtered
    .map((w) => TYPO_DICTIONARY[w] || w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function cleanSearchTokens(text: string): string[] {
  const norm = normalizeText(text);
  const rawWords = norm.split(" ").filter(Boolean);
  const words = rawWords.map((w) => (TYPO_DICTIONARY[w] ? TYPO_DICTIONARY[w].toLowerCase() : w));
  return words.filter((w) => w.length >= 3 && !QUERY_CLEANUP_WORDS.has(w) && !/^\d+$/.test(w));
}

// Mencari produk dengan multi-matching (SKU, nama, kata kunci, kategori)
export function findProductsMatching(snap: StoreSnapshot, query: string): ProductSnapshot[] {
  const qClean = normalizeText(query);
  const tokens = cleanSearchTokens(query);

  // 1. Cek kecocokan persis SKU
  for (const p of snap.products) {
    if (p.sku.toLowerCase() === qClean || tokens.includes(p.sku.toLowerCase())) {
      return [p];
    }
  }

  // 2. Cek kecocokan substring nama produk
  const subMatches = snap.products.filter((p) => {
    const pn = normalizeText(p.name);
    return pn.includes(qClean) || (tokens.length >= 2 && pn.includes(tokens.join(" ")));
  });
  if (subMatches.length > 0) return subMatches;

  if (!tokens.length) return [];

  // 3. Skor kecocokan token kata kunci (mendukung kata 3 huruf seperti mie, teh, api, gas)
  const scored = snap.products.map((p) => {
    const pTokens = normalizeText(p.name).split(" ").filter((t) => t.length >= 3);
    const catTokens = p.categoryName ? normalizeText(p.categoryName).split(" ") : [];
    const allP = [...pTokens, ...catTokens];

    let hits = 0;
    for (const t of tokens) {
      if (allP.some((x) => x === t || (x.length > 3 && t.length > 3 && (x.startsWith(t) || t.startsWith(x))))) {
        hits++;
      }
    }
    const score = hits / Math.max(tokens.length, 1);
    return { p, hits, score };
  });

  const valid = scored.filter((s) => s.hits > 0).sort((a, b) => b.score - a.score || b.hits - a.hits);
  return valid.map((v) => v.p);
}

// Menemukan 1 produk paling relevan
function findBestProduct(snap: StoreSnapshot, text: string): ProductSnapshot | null {
  const matches = findProductsMatching(snap, text);
  return matches.length > 0 ? matches[0] : null;
}

// Membaca konteks produk terakhir dari riwayat obrolan (Multi-turn conversation)
function resolveContextProduct(history: ChatTurn[], snap: StoreSnapshot): ProductSnapshot | null {
  if (!history || !history.length) return null;
  const recentTurns = history.slice(-4).reverse();
  for (const turn of recentTurns) {
    const matches = findProductsMatching(snap, turn.text);
    if (matches.length > 0) return matches[0];
  }
  return null;
}

function periodLabel(msg: string): { key: "today" | "week" | "month"; label: string } {
  if (/bulan/.test(msg)) return { key: "month", label: "bulan ini (30 hari terakhir)" };
  if (/minggu|pekan|7 hari/.test(msg)) return { key: "week", label: "7 hari terakhir" };
  return { key: "today", label: "hari ini" };
}

function periodText(p: PeriodTotals, label: string): string {
  if (p.txCount === 0) {
    return `Untuk ${label} belum ada transaksi yang tercatat. Kalau toko sudah buka, coba catat penjualan lewat Mode Kasir ya.`;
  }
  const margin = p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0;
  return `Untuk ${label}, ada **${p.txCount} transaksi** dengan omzet **${formatIDR(p.revenue)}** dan laba bersih **${formatIDR(p.profit)}** (margin sekitar ${margin}%).`;
}

// Format daftar barang per kategori
function buildInventoryListing(
  snap: StoreSnapshot,
  filterCategory?: string,
  filterCondition?: "ALL" | "LOW" | "EMPTY" | "HIGH_MARGIN"
): string {
  let list = [...snap.products];

  if (filterCategory) {
    const catClean = normalizeText(filterCategory);
    list = list.filter((p) => normalizeText(p.categoryName || "").includes(catClean));
  }

  if (filterCondition === "EMPTY") {
    list = list.filter((p) => p.stock <= 0);
  } else if (filterCondition === "LOW") {
    list = list.filter((p) => p.stock > 0 && p.stock <= p.minStock);
  } else if (filterCondition === "HIGH_MARGIN") {
    list.sort((a, b) => (b.sellPrice - b.costPrice) - (a.sellPrice - a.costPrice));
    list = list.slice(0, 10);
  }

  if (list.length === 0) {
    if (filterCondition === "EMPTY") return "Kabar bagus! Tidak ada barang yang stoknya habis di toko saat ini.";
    if (filterCondition === "LOW") return "Semua stok barang masih berada di atas batas minimum. Tidak ada stok kritis.";
    if (filterCategory) return `Belum ada produk yang terdaftar di kategori **${filterCategory}**.`;
    return "Belum ada produk yang terdaftar di database toko Anda.";
  }

  // Kelompokkan berdasarkan kategori
  const grouped = new Map<string, ProductSnapshot[]>();
  for (const p of list) {
    const cat = p.categoryName || "Umum / Lainnya";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(p);
  }

  const sections: string[] = [];
  grouped.forEach((items, cat) => {
    const lines = items.map((p) => {
      const stockBadge =
        p.stock <= 0
          ? "⚠️ **HABIS**"
          : p.stock <= p.minStock
          ? `⚠️ ${p.stock} ${p.unit} *(menipis)*`
          : `${p.stock} ${p.unit}`;
      return `• **${p.name}**: ${stockBadge} | Jual: ${formatIDR(p.sellPrice)}`;
    });
    sections.push(`📂 **Kategori ${cat}** (${items.length} item):\n${lines.join("\n")}`);
  });

  const totalModal = snap.products.reduce((s, p) => s + p.stock * p.costPrice, 0);

  let header = `Berikut daftar **${list.length} barang** di **${snap.storeName}**:`;
  if (filterCondition === "EMPTY") header = `⚠️ Terdapat **${list.length} barang** yang stoknya **KOSONG / HABIS**:`;
  if (filterCondition === "LOW") header = `⚠️ Terdapat **${list.length} barang** yang stoknya **MENIPIS** (perlu dikulakan):`;
  if (filterCondition === "HIGH_MARGIN") header = `💰 Ini **${list.length} barang** dengan keuntungan (nominal laba per item) tertinggi:`;

  return `${header}\n\n${sections.join("\n\n")}\n\n💡 *Total aset modal stok toko saat ini: **${formatIDR(totalModal)}***. Mau cek detail barang tertentu atau unduh laporan Excel?`;
}

// Analisis rekomendasi barang yang sebaiknya ditambahkan ke warung/toko
function buildProductAdditionAdvice(snap: StoreSnapshot): string {
  const currentNames = snap.products.map((p) => normalizeText(p.name)).join(" ");
  const currentCategories = (snap.categories || []).map((c) => normalizeText(c));

  // Rekomendasi staples Indonesia berdasarkan perputaran dan margin
  const recommendations: { title: string; desc: string; items: string[] }[] = [];

  // 1. Telur & Bumbu Dapur
  const hasEgg = /telur|telor/.test(currentNames);
  const hasSeasoning = /royco|masako|sasa|bumbu|garam|kecap|saus/.test(currentNames);
  if (!hasEgg || !hasSeasoning) {
    const items: string[] = [];
    if (!hasEgg) items.push("**Telur Ayam Ras / Negeri (kg)**: Perputaran harian tercepat, pembeli sembako pasti beli.");
    if (!hasSeasoning) items.push("**Bumbu Masak Sachet**: Royco Sapi/Ayam, Masako, Micin Sasa, Garam meja (modal sangat kecil, tahan lama).");
    items.push("**Kecap & Saus**: Kecap Manis Bango sachet/pouch kecil & Saus Sambal ABC.");
    recommendations.push({
      title: "1. Kebutuhan Dapur Harian (Traffic Builder - Penarik Pembeli Harian)",
      desc: "Barang-barang ini membuat tetangga mampir ke toko hampir setiap hari:",
      items,
    });
  }

  // 2. Minuman Dingin & Air Mineral
  const hasWater = /aqua|le minerale|minerale|air mineral/.test(currentNames);
  const hasCoffeePouch = /good day|luwak|torabika/.test(currentNames);
  if (!hasWater || !hasCoffeePouch) {
    const items: string[] = [];
    if (!hasWater) items.push("**Air Mineral**: Aqua 600ml / Le Minerale & Aqua Gelas (wajib ada untuk warung).");
    if (!hasCoffeePouch) items.push("**Minuman Seduh / Renceng**: Good Day Cappuccino, Luwak White Koffie, Nutrisari dingin.");
    items.push("**Susu Kental Manis**: Frisian Flag / Indomilk sachet renceng.");
    recommendations.push({
      title: "2. Minuman Cepat Saji (Margin 20-30%)",
      desc: "Minuman dingin atau sachet seduh memberikan margin lebih tebal dari sembako murni:",
      items,
    });
  }

  // 3. Obat-obatan Warung & Perlengkapan Mandi (Tebal Margin)
  const hasMeds = /bodrex|paracetamol|panadol|tolak angin|promag/.test(currentNames);
  const hasBath = /lifebuoy|pepsodent|rinso|daia|sampo|shampoo/.test(currentNames);
  if (!hasMeds || !hasBath) {
    const items: string[] = [];
    if (!hasMeds) items.push("**Obat Warung Darurat (Margin 30-45%)**: Bodrex, Paracetamol/Panadol, Tolak Angin sachet, Promag, Minyak Kayu Putih Cap Lang.");
    if (!hasBath) items.push("**Kebutuhan Mandi & Cuci Eceran**: Sabun mandi batangan Lifebuoy/Nuvo, Pasta gigi Pepsodent, Deterjen Rinso/Daia renceng.");
    recommendations.push({
      title: "3. Obat Warung P3K & Perlengkapan Mandi (Margin 30-40% Paling Gemuk)",
      desc: "Orang sering mencari obat saat darurat malam/pagi hari, pembeli tidak sensitif harga:",
      items,
    });
  }

  // 4. Layanan Pengikat Pelanggan
  const itemsTraffic = [
    "**Gas Melon LPG 3kg & Air Galon**: Walau untungnya sedikit (Rp 1.000 - 2.000 per tabung), pelanggan gas/galon pasti belanja barang dapur lainnya.",
    "**Rokok Filter Paling Laris & Korek Gas**: (Bila toko Anda menjual rokok) seperti Djarum Super, Sampoerna Mild, Surya 16 & Korek Tokai — penyumbang kas harian terbesar warung kelontong.",
  ];
  recommendations.push({
    title: "4. Magnet Pelanggan Rutin",
    desc: "Produk yang membuat pelanggan kembali setiap 3-5 hari sekali:",
    items: itemsTraffic,
  });

  const formattedRecs = recommendations
    .map((r) => `📌 **${r.title}**\n${r.desc}\n${r.items.map((it) => `• ${it}`).join("\n")}`)
    .join("\n\n");

  return `Melihat katalog **${snap.storeName}** yang ada sekarang (sudah ada ${snap.products.length} barang seperti Beras, Minyak, Mie, Gula, Kopi), berikut rekomendasi barang yang **sangat disarankan untuk ditambahkan** agar warung lebih ramai:\n\n${formattedRecs}\n\n💡 **Tips Eksekusi:**\nJangan langsung kulakan kartonan besar ya! Ambil saja **1-2 renceng** atau **1/2 karton** dulu untuk tes minat tetangga selama 1-2 minggu. Kalau cepat habis, baru tambah modal kulakannya.`;
}

// Saran peningkatan omzet & diskusi bisnis warung
function buildBusinessGrowthAdvice(snap: StoreSnapshot, subtopic?: string): string {
  if (subtopic === "sepi") {
    return `Kalau toko terasa agak sepi, biasanya ada 3 faktor penentu di ritel/warung sembako:\n\n1. **Ketersediaan Barang Pokok (Jangan Sering Kosong):** Pelanggan yang kecewa karena 2x mencari beras/telur/minyak tapi stok kosong akan berpindah langganan ke warung sebelah.\n2. **Papan Nama & Tampilan Depan:** Pastikan etalase depan terang dan rapi. Barang cemilan anak-anak atau minuman digantung eye-level.\n3. **Keramahan & Kecepatan Kasir:** Sapaan ramah dan nota jelas (bisa kirim via WA) membuat toko Anda terlihat profesional dan terpercaya.\n\nCoba cek stok barang yang menipis hari ini, pastikan barang pokok selalu aman.`;
  }

  if (subtopic === "promo") {
    return `Ini beberapa ide promo hemat modal untuk **${snap.storeName}**:\n\n• **Paket Bundling Sembako Hemat:**\n  Beras 5kg + Minyak Goreng 2L + Gula Pasir 1kg diskon Rp 2.000 (diskon sedikit tapi omzet langsung terdorong cepat).\n• **Paket Sarapan Cepat:**\n  Indomie Goreng + 2 butir Telur + Saus Sachet seharga Rp 10.000 pas.\n• **Jumat Berkah:**\n  Setiap belanja di atas Rp 50.000 gratis 1 bungkus mie instan atau teh sachet.\n\nPromo seperti ini membuat perputaran stok barang lambat jadi lebih kencang!`;
  }

  return `Untuk meningkatkan omzet dan laba bersih di **${snap.storeName}**, ini 4 strategi praktis yang bisa langsung diterapkan:\n\n1. **Terapkan 'Impulse Buy' di Dekat Meja Kasir:**\n   Taruh barang-barang kecil bermargin tebal di samping layar kasir (permen, korek gas, cokelat, obat sachet, kopi sachet). Pembeli yang sedang menunggu kembalian sering kali menambahkan barang ini secara spontan.\n\n2. **Kombinasikan Barang Margin Tipis + Tebal (Cross-Selling):**\n   Sembako murni (beras, minyak) marginnya tipis (8-12%), jadikan penarik pelanggan. Tapi tawarkan juga pelengkapnya yang bermargin 20-35% (bumbu racik, kecap, santan instan, minuman dingin).\n\n3. **Sediakan Pembayaran QRIS:**\n   Banyak anak muda dan pekerja malas bawa uang tunai receh. Menyediakan QRIS bikin mereka lebih mudah belanja banyak.\n\n4. **Pisahkan Uang Kasir dengan Uang Dompet Pribadi:**\n   Ini kunci nomor 1 UMKM bertahan. Semua pemasukan harus tercatat di Mode Kasir, jangan mengambil uang laci toko untuk keperluan dapur tanpa dicatat sebagai pengeluaran.\n\nMau diskusi soal barang apa yang marginnya paling besar di toko Anda saat ini?`;
}

export function runLocalAgent(message: string, history: ChatTurn[], snap: StoreSnapshot): AgentResult {
  const raw = message.trim();
  const msg = raw.toLowerCase();
  const isQuestion = /\?|\b(berapa|brp|apa|apakah|gimana|bagaimana|kenapa|mengapa|siapa|mana|ada)\b/.test(msg);

  // 1. Terima kasih
  if (/\b(terima kasih|makasih|thanks|thx|tengkyu|maturnuwun)\b/.test(msg)) {
    return {
      reply: pick([
        "Sama-sama! Senang bisa bantu. Kalau ada stok yang mau dicek atau mau diskusi toko, tinggal chat ya.",
        "Siap, kembali kasih! Semangat jualan hari ini! Kabari saya kalau butuh bantuan apa pun.",
      ]),
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  // 2. Sapaan & Kemampuan
  if (
    /^(halo|hai|hi|hei|hey|pagi|siang|sore|malam|assalam|permisi|test|tes)\b/.test(msg) ||
    /\b(bisa (bantu|apa)|bantu apa|fitur|kemampuan|kamu siapa|siapa kamu)\b/.test(msg)
  ) {
    const lowCount = snap.products.filter((p) => p.stock <= p.minStock).length;
    const hint =
      lowCount > 0
        ? `\n\n⚠️ Sekarang ada **${lowCount} barang** yang stoknya menipis, mau saya buatkan daftar belanja?`
        : "\n\n✅ Semua stok barang toko Anda saat ini dalam kondisi aman.";

    return {
      reply: `${/^(halo|hai|hi|hei|hey|pagi|siang|sore|malam|assalam|permisi)/.test(msg) ? "Halo! " : ""}Saya asisten gudang & operasional **${snap.storeName}**.\n\nKita bisa ngobrol santai seputar toko Anda:\n• Cek stok & harga barang tertentu (misal: *"stok kapal api ada berapa?"*)\n• Tampilkan daftar semua barang / per kategori (*"list barang sembako"*)\n• Diskusi ide produk baru (*"barang apa yang sebaiknya ditambahkan?"*)\n• Strategi omzet & saran harga jual (*"gimana cara naikin penjualan?"*)\n• Catat barang masuk & ekspor laporan Excel${hint}`,
      suggestions: [
        "List barang yang ada di toko",
        "Barang apa yang sebaiknya ditambahkan?",
        "Untung hari ini berapa?",
        "Barang apa yang perlu dikulakan?",
      ],
    };
  }

  // 3. Diskusi barang baru yang sebaiknya ditambahkan
  if (
    /sebaiknya (di)?tambah|perlu (di)?tambah|saran (barang|produk)|rekomendasi (barang|produk)|ide (barang|produk|jualan)|kurang apa|tambah.*(apa|lagi)|jualan apa lagi|produk baru|barang baru|barang apa yang laku|cepat laku/.test(
      msg
    ) && !/masuk|kulakan \d|stokin/.test(msg)
  ) {
    return {
      reply: buildProductAdditionAdvice(snap),
      suggestions: [
        "Gimana cara meningkatkan omzet toko?",
        "List barang yang ada di toko",
        "Barang apa yang paling laku?",
      ],
    };
  }

  // 4. Diskusi peningkatan omzet, strategi warung, toko sepi, promo
  if (/meningkatkan|naikin|menaikkan|omzet|penjualan|toko sepi|warung sepi|strategi|ide promo|paket promo|laris/.test(msg) && !/laporan|excel|terlaris/.test(msg)) {
    let sub: string | undefined = undefined;
    if (/sepi/.test(msg)) sub = "sepi";
    else if (/promo|bundling|paket/.test(msg)) sub = "promo";

    return {
      reply: buildBusinessGrowthAdvice(snap, sub),
      suggestions: [
        "Barang apa yang sebaiknya ditambahkan?",
        "Ide promo akhir pekan",
        "Apa barang yang paling laku?",
      ],
    };
  }

  // 5. List / Tampilkan Seluruh Barang / Per Kategori / Kondisi Stok
  const isListingIntent =
    /list (barang|produk)|daftar (barang|produk)|tampilkan (barang|produk|stok)|ada barang apa|produk apa saja|katalog (barang|produk)|semua barang|stok semua|semua stok|ada apa aja|daftar stok/.test(
      msg
    );

  if (isListingIntent) {
    let cat: string | undefined = undefined;
    if (/sembako/.test(msg)) cat = "Sembako";
    else if (/minuman|minum/.test(msg)) cat = "Minuman";
    else if (/makanan|camilan|snack/.test(msg)) cat = "Makanan";
    else if (/sabun|kebersihan|rumah|cuci/.test(msg)) cat = "Kebutuhan Rumah";

    let cond: "ALL" | "LOW" | "EMPTY" | "HIGH_MARGIN" = "ALL";
    if (/habis|kosong|nol|0/.test(msg)) cond = "EMPTY";
    else if (/menipis|kritis|kulak/.test(msg)) cond = "LOW";
    else if (/margin|untung|laba/.test(msg)) cond = "HIGH_MARGIN";

    return {
      reply: buildInventoryListing(snap, cat, cond),
      suggestions: [
        "Barang apa yang sebaiknya ditambahkan?",
        "Barang apa yang perlu dikulakan?",
        "Buatkan file Excel analisis profit",
      ],
    };
  }

  // 6. Excel / Laporan File
  if (/\b(excel|csv|unduh|download|spreadsheet)\b/.test(msg)) {
    const lowOnly = /belanja|menipis|habis|kulakan|restock/.test(msg);
    const excelPayload = buildProfitExcel(snap, lowOnly);
    return {
      reply: lowOnly
        ? "Beres. Saya sudah susun daftar belanja dari barang yang stoknya menipis, diurutkan dari yang paling besar sumbangan labanya. Angkanya dihitung langsung dari data toko, jadi aman dipakai."
        : "Siap, ini laporan analisis profit dan margin semua produk Anda. Angkanya dihitung langsung dari database toko.",
      toolUsed: "generateExcel",
      excelPayload,
      suggestions: ["Barang apa yang perlu dikulakan?", "Apa barang yang paling laku?"],
    };
  }

  // 7. Cek stok kritis / Kulakan / Burn Rate / Anomaly Guard
  if (
    /\b(burn rate|anomali|kebocoran|purchase order|prediksi)\b|\bpo\b|hampir habis|mau habis|menipis|perlu (di)?(kulak|restock|belanja|beli)|harus (di)?(kulak|restock|belanja|beli)|yang (di)?kulak|kritis/.test(
      msg
    )
  ) {
    const anomalies = buildAnomalies(snap);
    if (!anomalies.length) {
      return {
        reply: "Kabar baik, semua stok barang masih aman. Tidak ada barang yang diperkirakan habis dalam seminggu ke depan.",
        suggestions: DEFAULT_SUGGESTIONS,
      };
    }
    const critical = anomalies.filter(
      (a) => a.status === "CRITICAL" || a.status === "ANOMALY_NEGATIVE_MARGIN"
    ).length;
    return {
      reply: `Saya cek kecepatan jual 14 hari terakhir. Ada **${anomalies.length} barang** yang perlu perhatian, **${critical}** di antaranya sudah kritis. Tinggal klik tombol restock di bawah kalau setuju dengan jumlah sarannya.`,
      toolUsed: "detectInventoryAnomalies",
      anomalies,
      excelPayload: buildPurchaseOrder(anomalies),
      suggestions: ["Apa barang yang paling laku?", "Gimana kondisi toko hari ini?"],
    };
  }

  // 8. Barang Terlaris / Tidak Laku
  if (/terlaris|paling laku|paling laris|best ?seller|laris/.test(msg)) {
    const top = [...snap.products].filter((p) => p.sold30d > 0).sort((a, b) => b.sold30d - a.sold30d).slice(0, 5);
    if (!top.length) {
      return {
        reply: "Belum ada data transaksi penjualan 30 hari terakhir untuk menentukan barang terlaris. Buka menu Mode Kasir untuk mencatat penjualan baru ya.",
        suggestions: DEFAULT_SUGGESTIONS,
      };
    }
    const lines = top.map((p, i) => `${i + 1}. **${p.name}**: terjual ${p.sold30d} ${p.unit}, laba ${formatIDR(p.profit30d)}`).join("\n");
    return {
      reply: `Ini 5 barang paling laku dalam 30 hari terakhir di **${snap.storeName}**:\n\n${lines}\n\nPastikan stok barang-barang ini selalu terjaga agar tidak kehabisan saat pembeli datang.`,
      suggestions: ["Barang apa yang perlu dikulakan?", "Barang apa yang sebaiknya ditambahkan?"],
    };
  }

  if (/belum laku|tidak laku|ga laku|gak laku|nggak laku|kurang laku|sepi|dead stock|mengendap/.test(msg)) {
    const dead = snap.products.filter((p) => p.sold30d === 0 && p.stock > 0);
    if (!dead.length) {
      return {
        reply: "Hebat! Semua produk toko Anda memiliki transaksi penjualan dalam 30 hari terakhir. Tidak ada stok mati yang mengendap.",
        suggestions: DEFAULT_SUGGESTIONS,
      };
    }
    const lines = dead.slice(0, 6).map((p) => `• **${p.name}**: sisa ${p.stock} ${p.unit} (modal tertahan ${formatIDR(p.stock * p.costPrice)})`).join("\n");
    return {
      reply: `Ada **${dead.length} barang** yang belum terjual sama sekali selama 30 hari terakhir:\n\n${lines}\n\nSaran saya, jangan kulakan barang ini lagi dulu, dan coba buat paket promo kecil agar modal yang tertahan lekas berputar.`,
      suggestions: ["Apa barang yang paling laku?", "Ide promo akhir pekan"],
    };
  }

  // 9. Saran Harga Jual & Margin
  if (/(dijual|jual).*(berapa|brp)|harga jual|enaknya|bagusnya|margin/.test(msg) && !/laporan|excel/.test(msg)) {
    const moneyMatch = msg.match(/([0-9][0-9.]*(?:,[0-9]+)?)\s*(rb|ribu|k)?/g);
    let cost = 0;
    if (moneyMatch) {
      for (const m of moneyMatch) {
        const v = m.trim();
        const num = parseFloat(v.replace(/rb|ribu|k/g, "").replace(/\./g, "").replace(",", "."));
        const val = /(rb|ribu|k)$/.test(v) ? num * 1000 : num;
        if (val >= 500) cost = Math.max(cost, val);
      }
    }
    const product = findBestProduct(snap, raw) || resolveContextProduct(history, snap);
    if (!cost && product) cost = product.costPrice;

    if (cost > 0) {
      const p10 = roundTo500(cost * 1.1);
      const p15 = roundTo500(cost * 1.15);
      const p20 = roundTo500(cost * 1.2);
      const p25 = roundTo500(cost * 1.25);
      const name = product ? `**${product.name}**` : "barang tersebut";
      const now = product
        ? `\n\nHarga jual di sistem saat ini: **${formatIDR(product.sellPrice)}** (untung ${formatIDR(
            product.sellPrice - product.costPrice
          )} per ${product.unit}).`
        : "";
      return {
        reply: `Dengan modal kulakan **${formatIDR(cost)}**, untuk ${name} saran harga jualnya:\n\n• Margin 10%: **${formatIDR(p10)}** *(bersaing ketat / grosir)*\n• Margin 15%: **${formatIDR(p15)}** *(standar aman untuk sembako laris)*\n• Margin 20%: **${formatIDR(p20)}** *(wajar untuk warung eceran)*\n• Margin 25%: **${formatIDR(p25)}** *(bagus untuk camilan & minuman)*\n\nStandar warung kelontong: sembako 10-15%, sedangkan camilan/minuman/obat 20-25%.${now}`,
        suggestions: DEFAULT_SUGGESTIONS,
      };
    }
    return {
      reply: "Boleh, beri tahu saya harga modalnya dulu ya. Contoh: *'kopi modal 12.500 enaknya dijual berapa?'* atau sebut nama barang yang sudah ada di toko.",
      suggestions: ["Kopi modal 12.500 enaknya dijual berapa?"],
    };
  }

  // 10. Ringkasan Kondisi Toko / Untung / Omzet
  if (/kondisi|ringkasan|rangkuman|perkembangan|gimana toko|bagaimana toko|toko saya/.test(msg) && !/stok/.test(msg)) {
    const low = snap.products.filter((p) => p.stock <= p.minStock).length;
    const top = [...snap.products].sort((a, b) => b.sold30d - a.sold30d)[0];
    return {
      reply: `Ringkasan **${snap.storeName}**:\n\n• **Hari ini:** ${snap.today.txCount} transaksi, omzet **${formatIDR(snap.today.revenue)}**, laba bersih **${formatIDR(snap.today.profit)}**\n• **7 hari terakhir:** omzet **${formatIDR(snap.week.revenue)}**, laba bersih **${formatIDR(snap.week.profit)}**\n• **30 hari terakhir:** omzet **${formatIDR(snap.month.revenue)}**, laba bersih **${formatIDR(snap.month.profit)}**\n• **Stok menipis:** **${low} barang**${top && top.sold30d > 0 ? `\n• **Paling laku:** **${top.name}** (${top.sold30d} ${top.unit})` : ""}`,
      suggestions: low > 0 ? ["Barang apa yang perlu dikulakan?", "Apa barang yang paling laku?"] : DEFAULT_SUGGESTIONS,
    };
  }

  if (/untung|laba|omzet|pendapatan|pemasukan|cuan/.test(msg) && !/tambah|masuk|harga/.test(msg)) {
    const { key, label } = periodLabel(msg);
    return {
      reply: periodText(snap[key], label),
      suggestions: ["Apa barang yang paling laku?", "Barang apa yang perlu dikulakan?"],
    };
  }

  // 11. Pertanyaan Stok & Harga Barang Spesifik (Fuzzy Match & Multi-match)
  const addVerb = /\b(tambah|tambahin|nambah|nambahin|masuk|masukin|masukkan|kulakan|restock|restok|catat|catatin|input|datang|beli|belanja)\b/.test(msg);
  const searchedItemName = extractQueryItemName(raw);
  const matchedProducts = findProductsMatching(snap, raw);
  // PENTING: Hanya gunakan contextProduct jika user TIDAK menyebut nama barang baru secara eksplisit!
  const contextProduct = !searchedItemName ? resolveContextProduct(history, snap) : null;
  const targetProducts = matchedProducts.length ? matchedProducts : contextProduct ? [contextProduct] : [];

  // Jika user spesifik menanyakan barang yang TIDAK ADA / BELUM TERDAFTAR di toko
  if (!addVerb && !matchedProducts.length && searchedItemName && (isQuestion || /stok|stock|sisa|tinggal|ada|harga|modal|jual|cek/.test(msg))) {
    return {
      reply: `Barang **${searchedItemName}** saat ini **belum ada / belum terdaftar** di sistem **${snap.storeName}** (stok tidak ada / belum pernah diinput).\n\nJika Anda baru saja kulakan atau ingin mulai menjual barang ini, Anda bisa langsung mencatatnya ke sistem. Cukup ketik santai, misalnya:\n• *"Tambah ${searchedItemName} 10 pcs modal 15rb"*`,
      suggestions: [
        `Tambah stok ${searchedItemName}`,
        "List barang yang ada di toko",
        "Barang apa yang sebaiknya ditambahkan?",
      ],
    };
  }

  // Jika bukan perintah menambah stok, dan ada produk yang cocok dengan pertanyaan
  if (!addVerb && targetProducts.length > 0 && (isQuestion || /stok|stock|sisa|tinggal|ada|harga|modal|jual/.test(msg))) {
    if (targetProducts.length === 1) {
      const p = targetProducts[0];
      const burn = p.sold14d / 14;
      const days = burn > 0 ? Math.round(p.stock / burn) : null;
      const state =
        p.stock <= 0
          ? "⚠️ Stoknya saat ini **KOSONG / HABIS**, segera kulakan ya."
          : p.stock <= p.minStock
          ? "⚠️ Stoknya sudah **di bawah batas minimum**, perlu segera ditambah."
          : "✅ Stoknya masih dalam batas **aman**.";

      const velocity = days !== null ? ` Dengan kecepatan jual sekarang, stok ini cukup untuk **${days} hari**.` : " Belum ada transaksi penjualan dalam 2 minggu terakhir.";

      return {
        reply: `📦 **${p.name}**\n• Sisa stok: **${p.stock} ${p.unit}** (${state})\n• Perkiraan habis:${velocity}\n• Harga modal: **${formatIDR(p.costPrice)}** / ${p.unit}\n• Harga jual: **${formatIDR(p.sellPrice)}** / ${p.unit} (keuntungan ${formatIDR(p.sellPrice - p.costPrice)})`,
        suggestions: [`Tambah stok ${p.name}`, `Bagusnya ${p.name} dijual berapa?`, "List barang yang ada di toko"],
      };
    }

    // Jika ada beberapa barang yang cocok (misal tanya "kopi" atau "minyak")
    const lines = targetProducts.slice(0, 6).map((p) => {
      const status = p.stock <= 0 ? "(HABIS)" : p.stock <= p.minStock ? "(Menipis)" : "(Aman)";
      return `• **${p.name}**: stok **${p.stock} ${p.unit}** ${status} | Jual: ${formatIDR(p.sellPrice)}`;
    });

    return {
      reply: `Ditemukan **${targetProducts.length} barang** yang cocok dengan pencarian Anda:\n\n${lines.join("\n")}\n\nKetik nama barang yang lebih spesifik untuk melihat rincian modal dan analisis perputarannya.`,
      suggestions: targetProducts.slice(0, 3).map((p) => `Cek stok ${p.name}`),
    };
  }

  // 12. Catat Barang Masuk (Bahasa Alami Santai)
  const items = extractStockItems(raw);
  const looksLikeAdd = addVerb || (!isQuestion && items.length > 0 && /\d/.test(raw));
  if (looksLikeAdd) {
    if (!items.length) {
      return {
        reply: "Boleh! Barang apa yang mau dicatat masuk dan berapa jumlahnya? Ketik santai saja, contoh:\n• *'tambah minyak goreng tropical 20 pouch'* atau\n• *'masuk indomie goreng 50 bungkus modal 2900'*",
        suggestions: ["Tambah minyak tropical 20", "Tambah beras ramos 10 sak"],
      };
    }
    const stockInDraft = buildStockInDraft(snap, items);
    const newCount = stockInDraft.filter((d) => !d.matchedProductId).length;
    return {
      reply: `Oke, saya sudah rapikan catatan barang masuk untuk **${stockInDraft.length} barang**${newCount ? ` (${newCount} di antaranya barang baru)` : ""}. Ejaan dan nama sudah dicocokkan dengan katalog toko Anda. Silakan cek jumlah dan harga modalnya di bawah, lalu klik konfirmasi untuk menyimpan.`,
      toolUsed: "matchProductCatalog",
      stockInDraft,
      suggestions: ["Gimana kondisi toko hari ini?", "List barang yang ada di toko"],
    };
  }

  // 13. Sebut Nama Barang Saja (Inquiry Cepat)
  if (targetProducts.length > 0) {
    const p = targetProducts[0];
    return {
      reply: `📦 **${p.name}**\n• Stok saat ini: **${p.stock} ${p.unit}**\n• Modal: **${formatIDR(p.costPrice)}** | Harga Jual: **${formatIDR(p.sellPrice)}**\n\nMau tambah stok barang ini, cek kecepatan habisnya, atau minta saran harga jual?`,
      suggestions: [`Tambah stok ${p.name}`, `Berapa hari lagi ${p.name} habis?`, `Saran harga jual ${p.name}`],
    };
  }

  // 14. Fallback yang Cerdas, Hangat & Solutif
  return {
    reply: `Saya siap membantu operasional toko **${snap.storeName}**! Coba ketik pertanyaan Anda, misalnya:\n\n• **Cek Stok & Katalog:** *"List barang yang ada di toko"* atau *"Berapa stok kapal api?"*\n• **Diskusi Produk:** *"Barang apa yang sebaiknya ditambahkan?"*\n• **Strategi Toko:** *"Gimana cara meningkatkan omzet toko?"*\n• **Harga & Laba:** *"Kopi modal 12.500 enaknya dijual berapa?"*\n• **Input Kulakan:** *"Masuk minyak goreng tropical 20 pouch modal 32rb"*`,
    suggestions: DEFAULT_SUGGESTIONS,
  };
}
