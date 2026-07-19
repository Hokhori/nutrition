"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Flame } from "lucide-react";
import { ACTIVITY_PRESETS, activityKcal } from "@/lib/activities";
import { fmt } from "@/lib/format";

type Activity = {
  id: number;
  name: string;
  durationMin: number | null;
  kcal: number;
};

const num = (v: string) => parseFloat(String(v).replace(",", ".")) || 0;

export function ActivityPanel({
  activities,
  currentWeightKg,
  baseTargetKcal,
  activityKcal: totalKcal,
  effectiveTargetKcal,
}: {
  activities: Activity[];
  currentWeightKg: number | null;
  baseTargetKcal: number | null;
  activityKcal: number;
  effectiveTargetKcal: number | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"preset" | "manual">("preset");
  const [presetKey, setPresetKey] = useState(ACTIVITY_PRESETS[0].key);
  const [duration, setDuration] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const preset = ACTIVITY_PRESETS.find((p) => p.key === presetKey)!;
  const durMin = num(duration);
  const preview =
    currentWeightKg && durMin > 0 ? activityKcal(preset.met, currentWeightKg, durMin) : null;

  async function add() {
    let body: Record<string, unknown>;
    if (mode === "preset") {
      if (!currentWeightKg) {
        toast.error("Logue ton poids (page Objectif) pour le calcul, ou passe en mode manuel.");
        return;
      }
      if (durMin <= 0) {
        toast.error("Indique une durée");
        return;
      }
      body = { name: preset.label, met: preset.met, durationMin: durMin };
    } else {
      const k = num(manualKcal);
      if (!manualName.trim() || k <= 0) {
        toast.error("Nom et kcal requis");
        return;
      }
      body = { name: manualName.trim(), kcal: k };
    }
    setSaving(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success("Activité ajoutée");
      setDuration("");
      setManualName("");
      setManualKcal("");
      router.refresh();
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Activité supprimée");
      router.refresh();
    } catch {
      toast.error("Suppression impossible");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Effet sur le cap du jour */}
      <div className="card p-4">
        <div className="flex items-center gap-2 text-[color:var(--color-brand)]">
          <Flame size={18} />
          <span className="font-semibold">{fmt(totalKcal)} kcal brûlées aujourd’hui</span>
        </div>
        {baseTargetKcal !== null && (
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
            Cap du jour : {fmt(baseTargetKcal)}
            {totalKcal > 0 && (
              <>
                {" "}
                + {fmt(totalKcal)} sport ={" "}
                <span className="font-semibold text-[color:var(--color-fg)]">
                  {fmt(effectiveTargetKcal)} kcal
                </span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Formulaire d'ajout */}
      <div className="card space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("preset")}
            className={`btn ${mode === "preset" ? "btn-primary" : "btn-ghost"}`}
          >
            Sport (auto)
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`btn ${mode === "manual" ? "btn-primary" : "btn-ghost"}`}
          >
            kcal manuel
          </button>
        </div>

        {mode === "preset" ? (
          <>
            <label className="block">
              <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Activité</span>
              <select className="input" value={presetKey} onChange={(e) => setPresetKey(e.target.value)}>
                {ACTIVITY_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Durée (min)</span>
              <input
                className="input"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="ex. 45"
              />
            </label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[color:var(--color-muted)]">
                {preview !== null ? `≈ ${fmt(preview)} kcal` : currentWeightKg ? "—" : "Poids requis pour le calcul"}
              </span>
              <button onClick={add} disabled={saving} className="btn btn-primary">
                <Plus size={16} /> {saving ? "…" : "Ajouter"}
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="block">
              <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Nom de l’activité</span>
              <input className="input" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="ex. Escalade" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[color:var(--color-muted)]">kcal brûlées</span>
              <input className="input" inputMode="numeric" value={manualKcal} onChange={(e) => setManualKcal(e.target.value)} placeholder="ex. 350" />
            </label>
            <div className="flex justify-end">
              <button onClick={add} disabled={saving} className="btn btn-primary">
                <Plus size={16} /> {saving ? "…" : "Ajouter"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Liste du jour */}
      {activities.length === 0 ? (
        <p className="py-6 text-center text-sm text-[color:var(--color-muted)]">
          Aucune activité aujourd’hui.
        </p>
      ) : (
        <ul className="card divide-y divide-[color:var(--color-border)]">
          {activities.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.name}</div>
                {a.durationMin ? (
                  <div className="text-xs text-[color:var(--color-muted)]">{fmt(a.durationMin)} min</div>
                ) : null}
              </div>
              <div className="shrink-0 text-sm font-semibold text-[color:var(--color-brand)]">
                {fmt(a.kcal)} kcal
              </div>
              <button
                onClick={() => remove(a.id)}
                disabled={deleting === a.id}
                className="btn-danger rounded-lg p-1.5"
                aria-label="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
