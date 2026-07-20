"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ACTIVITY_LABELS, type ActivityLevel } from "@/lib/nutrition";
import { fmt } from "@/lib/format";

type Settings = {
  sex: string | null;
  birthYear: number | null;
  heightCm: number | null;
  activityLevel: string;
  targetWeightKg: number | null;
  weeklyRateKg: number;
  manualKcalTarget: number | null;
  proteinTargetG: number | null;
};

type CalorieTarget = {
  target: number | null;
  bmr: number | null;
  tdee: number | null;
  dailyDelta: number | null;
  direction: "loss" | "gain" | "maintain";
  manual: boolean;
  missing: string[];
};

function numOrNull(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function GoalForm({
  settings,
  currentWeightKg,
  target,
}: {
  settings: Settings;
  currentWeightKg: number | null;
  target: CalorieTarget;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    sex: settings.sex ?? "",
    birthYear: settings.birthYear?.toString() ?? "",
    heightCm: settings.heightCm?.toString() ?? "",
    weight: currentWeightKg?.toString() ?? "",
    activityLevel: settings.activityLevel ?? "sedentary",
    targetWeightKg: settings.targetWeightKg?.toString() ?? "",
    weeklyRateKg: settings.weeklyRateKg?.toString() ?? "0.5",
    manualKcalTarget: settings.manualKcalTarget?.toString() ?? "",
  });

  function upd(k: keyof typeof f, v: string) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const weight = numOrNull(f.weight);
      if (weight && weight !== currentWeightKg) {
        await fetch("/api/weight", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ weightKg: weight }),
        });
      }
      const res = await fetch("/api/goal", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sex: f.sex || null,
          birthYear: numOrNull(f.birthYear),
          heightCm: numOrNull(f.heightCm),
          activityLevel: f.activityLevel,
          targetWeightKg: numOrNull(f.targetWeightKg),
          weeklyRateKg: numOrNull(f.weeklyRateKg) ?? 0.5,
          manualKcalTarget: numOrNull(f.manualKcalTarget),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Objectif enregistré");
      router.refresh();
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  const activities = Object.keys(ACTIVITY_LABELS) as ActivityLevel[];

  return (
    <div className="space-y-4">
      {/* Récap cap calorique */}
      <div className="card p-4">
        {target.target !== null ? (
          <div className="flex items-baseline justify-between">
            <span className="text-[color:var(--color-muted)]">Cap calorique journalier</span>
            <span className="text-2xl font-bold text-[color:var(--color-brand)]">
              {fmt(target.target)} kcal
            </span>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--color-warn)]">
            Complète le profil pour calculer le cap. Manque : {target.missing.join(", ") || "poids"}.
          </p>
        )}
        {!target.manual && target.bmr !== null && (
          <p className="mt-1 text-xs text-[color:var(--color-muted)]">
            Métabolisme {fmt(target.bmr)} · dépense {fmt(target.tdee)}
            {target.direction === "loss" && ` · déficit −${fmt(target.dailyDelta)} kcal/j`}
            {target.direction === "gain" && ` · surplus +${fmt(target.dailyDelta)} kcal/j`}
            {target.direction === "maintain" && ` · maintien`}
          </p>
        )}
      </div>

      <div className="card space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Sexe</span>
            <select className="input" value={f.sex} onChange={(e) => upd("sex", e.target.value)}>
              <option value="">—</option>
              <option value="m">Homme</option>
              <option value="f">Femme</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Année de naissance</span>
            <input className="input" inputMode="numeric" value={f.birthYear} onChange={(e) => upd("birthYear", e.target.value)} placeholder="1990" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Taille (cm)</span>
            <input className="input" inputMode="decimal" value={f.heightCm} onChange={(e) => upd("heightCm", e.target.value)} placeholder="178" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Poids actuel (kg)</span>
            <input className="input" inputMode="decimal" value={f.weight} onChange={(e) => upd("weight", e.target.value)} placeholder="80" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Niveau d’activité</span>
          <select className="input" value={f.activityLevel} onChange={(e) => upd("activityLevel", e.target.value)}>
            {activities.map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS[a]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-[color:var(--color-muted)]">
            💡 Avec l’onglet Activité, garde « Sédentaire » : ta base part d’une journée sans
            rien, et tu ajoutes tes pas + sport pour un cap qui colle au jour (sinon double comptage).
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Poids cible (kg)</span>
            <input className="input" inputMode="decimal" value={f.targetWeightKg} onChange={(e) => upd("targetWeightKg", e.target.value)} placeholder="75" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Rythme (kg/sem)</span>
            <input className="input" inputMode="decimal" value={f.weeklyRateKg} onChange={(e) => upd("weeklyRateKg", e.target.value)} placeholder="0.5" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-[color:var(--color-muted)]">
            Cap calorique manuel (optionnel — remplace le calcul)
          </span>
          <input className="input" inputMode="numeric" value={f.manualKcalTarget} onChange={(e) => upd("manualKcalTarget", e.target.value)} placeholder="ex. 2000" />
        </label>

        <button onClick={save} disabled={saving} className="btn btn-primary w-full">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
