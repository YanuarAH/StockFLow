"use client";

import { useEffect, useRef, useState } from "react";
import { formatRupiah } from "@/lib/utils";
import type {
  AgentResponse,
  AnomalyItem,
  CustomExcelPayload,
  MatchedStockItem,
} from "@/lib/agent/types";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  PackagePlus,
  Send,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  engine?: "gemini" | "lokal";
  stockInDraft?: MatchedStockItem[];
  stockInExecuted?: boolean;
  excelPayload?: CustomExcelPayload;
  anomalies?: AnomalyItem[];
  resolvedProductIds?: string[];
  suggestions?: string[];
}

function RichText({ text }: { text: string }) {
  const clean = text.replace(/`/g, "");
  const parts = clean.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <div className="text-sm leading-relaxed whitespace-pre-line">
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={i} className="italic text-slate-600">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function downloadCsv(payload: CustomExcelPayload) {
  const esc = (v: string | number) =>
    typeof v === "number" ? String(v) : `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    payload.headers.map(esc).join(","),
    ...payload.rows.map((r) => r.map(esc).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = payload.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [engine, setEngine] = useState<"gemini" | "lokal" | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "GREET" }),
        });
        const data: AgentResponse = await res.json();
        if (res.ok) {
          setEngine(data.engine);
          setMessages([
            { id: "greet", role: "agent", text: data.reply, engine: data.engine, suggestions: data.suggestions },
          ]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  function push(msg: Omit<ChatMessage, "id">) {
    setMessages((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const history = messages.slice(-10).map((m) => ({ role: m.role, text: m.text }));
    // Hapus chip saran dari pesan sebelumnya supaya tampilan tidak menumpuk
    setMessages((prev) => prev.map((m) => ({ ...m, suggestions: undefined })));
    push({ role: "user", text: content });
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHAT", message: content, history }),
      });
      const data: AgentResponse & { error?: string } = await res.json();
      if (!res.ok) {
        push({ role: "agent", text: data.error || "Maaf, ada gangguan. Coba lagi ya." });
      } else {
        setEngine(data.engine);
        push({
          role: "agent",
          text: data.reply,
          engine: data.engine,
          stockInDraft: data.stockInDraft,
          excelPayload: data.excelPayload,
          anomalies: data.anomalies,
          resolvedProductIds: [],
          suggestions: data.suggestions,
        });
      }
    } catch {
      push({ role: "agent", text: "Maaf, koneksi ke server terputus. Coba lagi ya." });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function updateDraft(msgId: string, idx: number, field: "qty" | "unitCost", value: number) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.stockInDraft) return m;
        const next = [...m.stockInDraft];
        next[idx] = { ...next[idx], [field]: value };
        return { ...m, stockInDraft: next };
      })
    );
  }

  function removeDraft(msgId: string, idx: number) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.stockInDraft
          ? { ...m, stockInDraft: m.stockInDraft.filter((_, i) => i !== idx) }
          : m
      )
    );
  }

  async function confirmStock(items: MatchedStockItem[]): Promise<string | null> {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CONFIRM_STOCK_IN", confirmedItems: items }),
    });
    const data = await res.json();
    return res.ok ? data.reply : null;
  }

  async function handleConfirmDraft(msg: ChatMessage) {
    if (!msg.stockInDraft?.length) return;
    setBusyKey(`draft-${msg.id}`);
    try {
      const reply = await confirmStock(msg.stockInDraft);
      if (reply) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, stockInExecuted: true } : m)));
        push({ role: "agent", text: reply, suggestions: ["Untung hari ini berapa?", "Barang apa yang perlu dikulakan?"] });
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRestock(msgId: string, list: AnomalyItem[], all: boolean) {
    if (!list.length) return;
    setBusyKey(all ? `${msgId}-ALL` : `${msgId}-${list[0].productId}`);
    try {
      const items: MatchedStockItem[] = list.map((a) => ({
        rawName: a.name,
        matchedProductId: a.productId,
        matchedProductName: a.name,
        matchedSku: a.sku,
        unit: a.unit,
        inferredCategory: "",
        confidence: 100,
        qty: a.recommendedRestockQty,
        unitCost: a.costPrice,
        previousCost: a.costPrice,
        currentStock: a.currentStock,
      }));
      const reply = await confirmStock(items);
      if (reply) {
        const ids = list.map((a) => a.productId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, resolvedProductIds: Array.from(new Set([...(m.resolvedProductIds || []), ...ids])) }
              : m
          )
        );
        push({ role: "agent", text: reply });
      }
    } finally {
      setBusyKey(null);
    }
  }

  const lastAgentId = [...messages].reverse().find((m) => m.role === "agent")?.id;

  return (
    <div className="flex flex-col h-[calc(100dvh-11rem)] lg:h-[calc(100dvh-6rem)] min-h-[440px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">Asisten Gudang</h1>
            <p className="text-xs text-slate-500 truncate">
              Tanya stok, untung, harga jual, atau catat barang masuk
            </p>
          </div>
        </div>
        {engine && (
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              engine === "gemini"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
            title={engine === "gemini" ? "Memakai Google Gemini" : "Mode lokal (tanpa GEMINI_API_KEY)"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${engine === "gemini" ? "bg-emerald-500" : "bg-slate-400"}`} />
            {engine === "gemini" ? "Gemini AI" : "Mode Lokal"}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-5 space-y-5 bg-slate-50">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const unresolved = (msg.anomalies || []).filter((a) => !(msg.resolvedProductIds || []).includes(a.productId));

          return (
            <div key={msg.id} className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isUser ? "bg-slate-800 text-white" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`min-w-0 max-w-[88%] sm:max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl ${
                    isUser
                      ? "bg-emerald-600 text-white rounded-tr-md"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-md shadow-xs"
                  }`}
                >
                  <RichText text={msg.text} />
                </div>

                {/* Kartu: konfirmasi barang masuk */}
                {msg.stockInDraft && msg.stockInDraft.length > 0 && (
                  <div className="w-full bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-xs">
                    <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2">
                      <PackagePlus className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-900">Konfirmasi barang masuk</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {msg.stockInDraft.map((item, idx) => (
                        <div key={idx} className="p-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{item.matchedProductName}</p>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  item.matchedProductId ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {item.matchedProductId
                                  ? `Sudah ada • stok ${item.currentStock} ${item.unit}`
                                  : "Barang baru"}
                              </span>
                            </div>
                            {!msg.stockInExecuted && (
                              <button
                                type="button"
                                onClick={() => removeDraft(msg.id, idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                aria-label="Hapus item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-[11px] font-medium text-slate-500">
                              Jumlah ({item.unit})
                              <input
                                type="number"
                                min={1}
                                disabled={msg.stockInExecuted}
                                value={item.qty}
                                onChange={(e) => updateDraft(msg.id, idx, "qty", Number(e.target.value))}
                                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 disabled:bg-slate-50"
                              />
                            </label>
                            <label className="text-[11px] font-medium text-slate-500">
                              Modal per {item.unit} (Rp)
                              <input
                                type="number"
                                min={0}
                                disabled={msg.stockInExecuted}
                                value={item.unitCost}
                                onChange={(e) => updateDraft(msg.id, idx, "unitCost", Number(e.target.value))}
                                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 disabled:bg-slate-50"
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500">
                        Total modal{" "}
                        <strong className="text-slate-900">
                          {formatRupiah(msg.stockInDraft.reduce((s, i) => s + i.qty * i.unitCost, 0))}
                        </strong>
                      </span>
                      {msg.stockInExecuted ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" /> Tersimpan
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busyKey === `draft-${msg.id}`}
                          onClick={() => handleConfirmDraft(msg)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                        >
                          {busyKey === `draft-${msg.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Simpan ke stok
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Kartu: stok menipis + restock 1 klik */}
                {msg.anomalies && msg.anomalies.length > 0 && (
                  <div className="w-full bg-white rounded-xl border border-amber-200 overflow-hidden shadow-xs">
                    <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        {msg.anomalies.length} barang perlu perhatian
                      </span>
                      {unresolved.length > 0 ? (
                        <button
                          type="button"
                          disabled={busyKey !== null}
                          onClick={() => handleRestock(msg.id, unresolved, true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[11px] font-bold cursor-pointer"
                        >
                          {busyKey === `${msg.id}-ALL` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                          Restock semua ({unresolved.length})
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Semua sudah direstock
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {msg.anomalies.map((a) => {
                        const done = (msg.resolvedProductIds || []).includes(a.productId);
                        return (
                          <div key={a.productId} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-slate-900">{a.name}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    done
                                      ? "bg-emerald-100 text-emerald-800"
                                      : a.status === "WARNING"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {done ? `Stok jadi ${a.currentStock + a.recommendedRestockQty} ${a.unit}` : `Sisa ${a.currentStock} ${a.unit}`}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{a.reason}</p>
                            </div>
                            {done ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={busyKey !== null}
                                onClick={() => handleRestock(msg.id, [a], false)}
                                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-800 text-[11px] font-bold cursor-pointer"
                              >
                                {busyKey === `${msg.id}-${a.productId}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                +{a.recommendedRestockQty} {a.unit} • {formatRupiah(a.estimatedRestockCost)}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Kartu: unduh Excel */}
                {msg.excelPayload && (
                  <div className="w-full bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{msg.excelPayload.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{msg.excelPayload.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadCsv(msg.excelPayload!)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Unduh</span>
                    </button>
                  </div>
                )}

                {/* Saran pertanyaan lanjutan */}
                {msg.id === lastAgentId && msg.suggestions && msg.suggestions.length > 0 && !loading && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="px-3 py-1.5 rounded-full bg-white border border-emerald-200 text-emerald-800 text-xs font-medium hover:bg-emerald-50 cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white border border-slate-200 shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya stok, list barang, saran produk baru, atau ide omzet..."
          className="flex-1 min-w-0 px-4 py-2.5 rounded-full border border-slate-300 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Kirim"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
