"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { fmt } from "@/lib/format";

type Progress = {
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  weeklyRateKg: number;
  kgRemaining: number | null;
  weeksRemaining: number | null;
  etaISO: string | null;
  calorieTarget: { target: number | null };
  series: { loggedOn: string; weightKg: number }[];
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-[color:var(--color-muted)]">{label}</div>
    </div>
  );
}

export function WeightPanel({ progress }: { progress: Progress }) {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  async function log() {
    const w = parseFloat(weight.replace(",", "."));
    if (!w || w <= 0) {
      toast.error("Poids invalide");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weightKg: w }),
      });
      if (!res.ok) throw new Error();
      toast.success("Poids enregistré");
      setWeight("");
      router.refresh();
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  const data = progress.series.map((p) => ({ date: p.loggedOn.slice(5), weight: p.weightKg }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Poids actuel" value={progress.currentWeightKg !== null ? `${fmt(progress.currentWeightKg, 1)} kg` : "—"} />
        <Stat label="Objectif" value={progress.targetWeightKg !== null ? `${fmt(progress.targetWeightKg, 1)} kg` : "—"} />
        <Stat label="Restant" value={progress.kgRemaining !== null ? `${fmt(progress.kgRemaining, 1)} kg` : "—"} />
      </div>

      {progress.etaISO && progress.weeksRemaining !== null && (
        <p className="text-center text-sm text-[color:var(--color-muted)]">
          À {fmt(progress.weeklyRateKg, 1)} kg/sem → objectif atteint vers{" "}
          <span className="text-[color:var(--color-fg)]">{progress.etaISO}</span> (~{progress.weeksRemaining} sem)
        </p>
      )}

      {/* Ajout de pesée */}
      <div className="card flex items-end gap-2 p-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Nouvelle pesée (kg)</span>
          <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ex. 79.4" />
        </label>
        <button onClick={log} disabled={saving} className="btn btn-primary">
          {saving ? "…" : "Enregistrer"}
        </button>
      </div>

      {/* Graphe */}
      {data.length >= 2 ? (
        <div className="card p-3">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    color: "var(--color-fg)",
                  }}
                  labelStyle={{ color: "var(--color-muted)" }}
                />
                {progress.targetWeightKg !== null && (
                  <ReferenceLine y={progress.targetWeightKg} stroke="var(--color-brand)" strokeDasharray="4 4" />
                )}
                <Line type="monotone" dataKey="weight" stroke="var(--color-brand)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-[color:var(--color-muted)]">
          Enregistre au moins deux pesées pour voir la courbe.
        </p>
      )}
    </div>
  );
}
