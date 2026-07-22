"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { X, Keyboard } from "lucide-react";

// Formats de codes-barres produits (EPC/EAN/UPC). On exclut QR, Code128, ITF…
// qui, essayés par défaut, ralentissent l'accroche et produisent des lectures
// parasites acceptées à tort après nettoyage des non-chiffres.
const HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

// Nombre de lectures IDENTIQUES consécutives exigées avant d'accepter un code.
// Une seule frame floue peut mal décoder (et passer le checksum) : la double
// confirmation élimine les codes erronés isolés.
const CONFIRMATIONS = 2;

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

  // onDetected via ref : évite de relancer la caméra à chaque rendu du parent
  // (le handler est recréé à chaque render et n'a pas à figurer en dépendance).
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(HINTS);
    let controls: IScannerControls | null = null;
    let done = false;
    let lastCode = "";
    let streak = 0;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result) => {
          if (!result || done) return;
          const code = result.getText().replace(/\D/g, "");
          if (code.length < 8) return;
          // Exige N lectures identiques d'affilée avant de valider.
          streak = code === lastCode ? streak + 1 : 1;
          lastCode = code;
          if (streak < CONFIRMATIONS) return;
          done = true;
          controls?.stop();
          onDetectedRef.current(code);
        },
      )
      .then((c) => {
        controls = c;
        if (done) c.stop(); // code déjà validé pendant l'init : ne pas laisser tourner
      })
      .catch(() =>
        setError("Caméra inaccessible. Autorise l'accès (HTTPS requis) ou saisis le code à la main."),
      );

    return () => controls?.stop();
  }, []);

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
