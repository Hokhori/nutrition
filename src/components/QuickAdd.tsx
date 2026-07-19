"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Globe, X } from "lucide-react";
import { MEAL_LABELS, fmt } from "@/lib/format";

type Food = {
  id: number;
  name: string;
  brand: string | null;
  kcal: number;
  servingSizeG: number | null;
};

type OffPer100 = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  sugarsG: number;
  fatG: number;
  saturatedG: number;
  fiberG: number;
  saltG: number;
};
type OffCandidate = {
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number | null;
  per100: OffPer100;
};

const MEALS = ["petit-dej", "dej", "diner", "snack"] as const;

export function QuickAdd({ date }: { date: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [off, setOff] = useState<OffCandidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [offLoading, setOffLoading] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [qty, setQty] = useState("100");
  const [meal, setMeal] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return;
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    debounce.current = setTimeout(async () => {
      if (q.length < 2) {
        setFoods([]);
        setOff(null);
        return;
      }
      setSearching(true);
      setOff(null);
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(q)}`);
        setFoods(res.ok ? await res.json() : []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, selected]);

  async function searchOff() {
    setOffLoading(true);
    try {
      const res = await fetch(`/api/openfoodfacts?q=${encodeURIComponent(query.trim())}`);
      const data = res.ok ? await res.json() : { candidates: [] };
      setOff(data.candidates ?? []);
    } finally {
      setOffLoading(false);
    }
  }

  async function addFromOff(c: OffCandidate) {
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: c.name,
          brand: c.brand,
          barcode: c.barcode,
          per_100g: c.per100,
          servingSizeG: c.servingSizeG,
          source: "openfoodfacts",
        }),
      });
      if (!res.ok) throw new Error();
      const food: Food = await res.json();
      toast.success(`« ${food.name} » ajouté à la base`);
      pick(food);
    } catch {
      toast.error("Création impossible");
    }
  }

  function pick(f: Food) {
    setSelected(f);
    setQty(f.servingSizeG ? String(f.servingSizeG) : "100");
    setFoods([]);
    setOff(null);
  }

  function reset() {
    setSelected(null);
    setQuery("");
    setQty("100");
    setMeal("");
  }

  async function save() {
    const quantityG = parseFloat(qty.replace(",", "."));
    if (!selected || !quantityG || quantityG <= 0) {
      toast.error("Quantité invalide");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          foodId: selected.id,
          quantityG,
          date,
          meal: meal || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Apport ajouté");
      reset();
      router.refresh();
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  if (selected) {
    const est = Math.round((selected.kcal * (parseFloat(qty.replace(",", ".")) || 0)) / 100);
    return (
      <div className="card p-3">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <div className="font-medium">{selected.name}</div>
            <div className="text-xs text-[color:var(--color-muted)]">
              {fmt(selected.kcal)} kcal / 100 g{selected.brand ? ` · ${selected.brand}` : ""}
            </div>
          </div>
          <button onClick={reset} className="btn-ghost rounded-lg p-1.5" aria-label="Annuler">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Quantité (g)</span>
            <input
              className="input"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              autoFocus
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Repas</span>
            <select className="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
              <option value="">—</option>
              {MEALS.map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-[color:var(--color-muted)]">≈ {est} kcal</span>
          <button onClick={save} disabled={saving} className="btn btn-primary">
            <Plus size={16} /> {saving ? "…" : "Ajouter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-3">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]"
        />
        <input
          className="input pl-9"
          placeholder="Ajouter un aliment…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {searching && <p className="mt-2 text-xs text-[color:var(--color-muted)]">Recherche…</p>}

      {foods.length > 0 && (
        <ul className="mt-2 divide-y divide-[color:var(--color-border)]">
          {foods.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => pick(f)}
                className="flex w-full items-center justify-between gap-2 py-2 text-left hover:opacity-80"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{f.name}</span>
                  {f.brand && (
                    <span className="block truncate text-xs text-[color:var(--color-muted)]">
                      {f.brand}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm text-[color:var(--color-muted)]">
                  {fmt(f.kcal)} kcal/100g
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!searching && query.trim().length >= 2 && foods.length === 0 && off === null && (
        <button onClick={searchOff} disabled={offLoading} className="btn btn-ghost mt-2 w-full">
          <Globe size={16} /> {offLoading ? "Recherche…" : "Chercher sur OpenFoodFacts"}
        </button>
      )}

      {off !== null && (
        <div className="mt-2">
          {off.length === 0 ? (
            <p className="text-xs text-[color:var(--color-muted)]">
              Aucun résultat OpenFoodFacts. Demande à Claude de créer l’aliment via le MCP.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--color-border)]">
              {off.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block truncate text-xs text-[color:var(--color-muted)]">
                      {fmt(c.per100.kcal)} kcal/100g{c.brand ? ` · ${c.brand}` : ""}
                    </span>
                  </span>
                  <button onClick={() => addFromOff(c)} className="btn btn-ghost shrink-0 px-2 py-1 text-sm">
                    <Plus size={14} /> Ajouter
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
