"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";

/** Section « Mes données » : export (portabilité) + suppression de compte (RGPD). */
export function AccountData({ email }: { email: string }) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/profile/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nutrition-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé");
    } catch {
      toast.error("Échec de l’export");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (confirmText.trim().toLowerCase() !== email.toLowerCase()) {
      toast.error("Saisis ton email exact pour confirmer");
      return;
    }
    if (!confirm("Cette action est irréversible. Supprimer définitivement ton compte et toutes tes données ?"))
      return;
    setDeleting(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Échec de la suppression");
        return;
      }
      toast.success("Compte supprimé");
      router.push("/login");
    } catch {
      toast.error("Échec de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="card space-y-5 p-4">
      <div>
        <h2 className="font-semibold">Mes données</h2>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
          Conformément au RGPD, tu peux exporter l’ensemble de tes données ou supprimer
          définitivement ton compte.
        </p>
      </div>

      <div>
        <button onClick={exportData} disabled={exporting} className="btn btn-ghost">
          <Download size={16} /> {exporting ? "Export…" : "Exporter mes données (JSON)"}
        </button>
      </div>

      <div className="border-t border-[color:var(--color-border)] pt-4">
        <div className="mb-2 flex items-center gap-2 font-medium text-[color:var(--color-danger)]">
          <Trash2 size={16} /> Supprimer mon compte
        </div>
        <p className="mb-2 text-sm text-[color:var(--color-muted)]">
          Efface ton compte et toutes tes données (apports, poids, activité, objectifs). Les aliments
          que tu as ajoutés au catalogue partagé sont conservés mais anonymisés. Action{" "}
          <strong>irréversible</strong>. Retire aussi ton consentement au traitement des données de
          santé. Pour confirmer, saisis ton email&nbsp;:
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input"
            placeholder={email}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
          <button onClick={deleteAccount} disabled={deleting} className="btn btn-danger shrink-0">
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
