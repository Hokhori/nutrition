"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles, ScanBarcode } from "lucide-react";
import { BarcodeScanner } from "./BarcodeScanner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "J'ai mangé 2 œufs et une tranche de pain",
  "Résumé de ma journée",
  "J'ai fait 30 min de course",
  "Je pèse 82 kg aujourd'hui",
];

export function AssistantChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : `⚠️ ${data.error || "Erreur"}`;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (res.ok) router.refresh(); // rafraîchit les données (repas/poids loggés)
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Connexion impossible." }]);
    } finally {
      setLoading(false);
    }
  }

  function onScanned(code: string) {
    setScanning(false);
    send(
      `J'ai scanné le code-barres ${code}. Cherche-le sur OpenFoodFacts et ajoute-le à mes aliments. S'il est absent, aide-moi à le créer, puis propose de le contribuer à OpenFoodFacts.`,
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 12rem)" }}>
      <div className="flex-1 space-y-3">
        {messages.length === 0 && (
          <div className="card p-4 text-sm text-[color:var(--color-muted)]">
            <div className="mb-2 flex items-center gap-2 font-medium text-[color:var(--color-fg)]">
              <Sparkles size={16} className="text-[color:var(--color-brand)]" /> Assistant nutrition
            </div>
            {"Dis-moi ce que tu as mangé, ton poids, ton sport, ou demande ton bilan. Je m'occupe de l'enregistrer."}
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-1 text-xs text-[color:var(--color-fg)] hover:opacity-80"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user"
                  ? "bg-[color:var(--color-brand)] text-[color:var(--color-brand-fg)]"
                  : "card"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="card px-3.5 py-2 text-sm text-[color:var(--color-muted)]">…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-16 mt-3 flex gap-2 sm:bottom-2"
      >
        <button
          type="button"
          onClick={() => setScanning(true)}
          disabled={loading}
          aria-label="Scanner un code-barres"
          className="btn btn-ghost shrink-0"
        >
          <ScanBarcode size={16} />
        </button>
        <input
          className="input"
          placeholder="Écris à l'assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>

      {scanning && <BarcodeScanner onDetected={onScanned} onClose={() => setScanning(false)} />}
    </div>
  );
}
