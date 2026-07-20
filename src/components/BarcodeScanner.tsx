"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { X, Keyboard } from "lucide-react";

/**
 * Scanner de code-barres via la caméra (ZXing). Marche sur iOS/Android en HTTPS.
 * Repli : saisie manuelle du code. Appelle `onDetected(code)` avec les chiffres.
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | null = null;
    let done = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result) => {
          if (!result || done) return;
          const code = result.getText().replace(/\D/g, "");
          if (code.length < 8) return;
          done = true;
          controls?.stop();
          onDetected(code);
        },
      )
      .then((c) => {
        controls = c;
      })
      .catch(() =>
        setError("Caméra inaccessible. Autorise l'accès (HTTPS requis) ou saisis le code à la main."),
      );

    return () => controls?.stop();
  }, [onDetected]);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manual.replace(/\D/g, "");
    if (code.length >= 8) onDetected(code);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between text-white">
          <span className="font-medium">Scanner un code-barres</span>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {!error ? (
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-4/5 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-white/10 p-3 text-sm text-white">{error}</p>
        )}

        <form onSubmit={submitManual} className="mt-4 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/10 px-3">
            <Keyboard size={16} className="text-white/60" />
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              inputMode="numeric"
              placeholder="Saisir le code manuellement"
              className="w-full bg-transparent py-2.5 text-white placeholder:text-white/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={manual.replace(/\D/g, "").length < 8}
            className="btn btn-primary shrink-0 disabled:opacity-40"
          >
            OK
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-white/60">
          Vise le code-barres du produit. Détection automatique.
        </p>
      </div>
    </div>
  );
}
