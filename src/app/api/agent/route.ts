import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { formatIDR } from "@/lib/agent/knowledge";
import { runGeminiAgent } from "@/lib/agent/gemini";
import { runLocalAgent } from "@/lib/agent/local";
import { buildAnomalies, buildSnapshot, executeStockIn } from "@/lib/agent/tools";
import type { AgentResponse, ChatTurn, MatchedStockItem } from "@/lib/agent/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action: "CHAT" | "GREET" | "CONFIRM_STOCK_IN" = body.action || "CHAT";

    // Eksekusi stok setelah pemilik toko menekan tombol konfirmasi / 1-klik restock
    if (action === "CONFIRM_STOCK_IN") {
      const items: MatchedStockItem[] = Array.isArray(body.confirmedItems) ? body.confirmedItems : [];
      if (!items.some((i) => i.qty > 0)) {
        return NextResponse.json({ error: "Tidak ada barang valid untuk disimpan." }, { status: 400 });
      }
      const done = await executeStockIn(session.storeId, items);
      return NextResponse.json({
        reply: `Beres! Stok sudah diperbarui untuk ${done.length} barang: ${done.join(", ")}. Kartu stok juga sudah tercatat.`,
        executedCount: done.length,
      });
    }

    const snap = await buildSnapshot(session.storeId, session.storeName);

    // Sapaan pembuka berisi ringkasan singkat toko
    if (action === "GREET") {
      const anomalies = buildAnomalies(snap);
      const critical = anomalies.filter((a) => a.status === "CRITICAL" || a.status === "ANOMALY_NEGATIVE_MARGIN").length;
      const first = session.userName.split(" ")[0];
      const sales =
        snap.today.txCount > 0
          ? `Hari ini sudah ada **${snap.today.txCount} transaksi** dengan laba **${formatIDR(snap.today.profit)}**.`
          : "Hari ini belum ada transaksi yang tercatat.";
      const stock =
        anomalies.length > 0
          ? `Ada **${anomalies.length} barang** yang stoknya perlu diperhatikan${critical ? `, ${critical} sudah kritis` : ""}.`
          : "Semua stok barang masih aman.";
      const res: AgentResponse = {
        engine: process.env.GEMINI_API_KEY ? "gemini" : "lokal",
        reply: `Halo ${first}! Saya asisten operasional & bisnis untuk **${snap.storeName}**.\n\n${sales} ${stock}\n\nKita bisa ngobrol santai seputar toko Anda tanpa perlu format kaku. Mau cek stok barang, lihat katalog, minta rekomendasi barang baru yang laku, atau diskusi strategi omzet?`,
        suggestions: [
          "List barang yang ada di toko",
          "Barang apa yang sebaiknya ditambahkan?",
          "Berapa stok kapal api?",
          "Gimana cara meningkatkan omzet toko?",
        ],
      };
      return NextResponse.json(res);
    }

    const message = String(body.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });
    }

    const history: ChatTurn[] = Array.isArray(body.history)
      ? body.history
          .filter((h: ChatTurn) => h && typeof h.text === "string" && (h.role === "user" || h.role === "agent"))
          .slice(-10)
      : [];

    const gemini = await runGeminiAgent(message, history, snap);
    const result = gemini ?? runLocalAgent(message, history, snap);
    const res: AgentResponse = { ...result, engine: gemini ? "gemini" : "lokal" };
    return NextResponse.json(res);
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json({ error: "Asisten sedang bermasalah. Coba lagi sebentar." }, { status: 500 });
  }
}
