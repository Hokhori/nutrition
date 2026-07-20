"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Search, Plus, Globe, Pencil } from "lucide-react";
import { fmt } from "@/lib/format";

type Food = {
  id: number;
  name: string;
  brand: string | null;
  kcal: number;
  servingSizeG: number | null;
};

type OffCandidate = {
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number | null;
  per100: {
    kcal: number;
    proteinG: number;
    carbsG: number;
    sugarsG: number;
    fatG: number;
    saturatedG: number;
    fiberG: number;
    saltG: number;
  };
};

const MACRO_FIELDS: { key: string; label: string }[] = [
  { key: "kcal", label: "kcal" },
  { key: "proteinG", label: "Protéines" },
  { key: "carbsG", label: "Glucides" },
  { key: "sugarsG", label: "Sucres" },
  { key: "addedSugarsG", label: "Sucres ajoutés" },
  { key: "fatG", label: "Lipides" },
  { key: "saturatedG", label: "Saturés" },
  { key: "fiberG", label: "Fibres" },
  { key: "saltG", label: "Sel" },
];

const num = (v: string) => parseFloat(String(v).replace(",", ".")) || 0;

export function AddFoodDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (f: Food) => void;
}) {
  const [mode, setMode] = useState<"manual" | "off">("off");

  async function createFood(body: Record<string, unknown>): Promise<Food | null> {
    const res = await fetch("/api/foods", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Création impossible (valeurs invalides ?)");
      return null;
    }
    return res.json();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="card max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Ajouter un aliment</h2>
          <button onClick={onClose} className="btn-ghost rounded-lg p-1.5" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        {/* Sélecteur de mode */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("off")}
            className={`btn ${mode === "off" ? "btn-primary" : "btn-ghost"}`}
          >
            <Globe size={16} /> OpenFoodFacts
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`btn ${mode === "manual" ? "btn-primary" : "btn-ghost"}`}
          >
            <Pencil size={16} /> Manuel
          </button>
        </div>

        {mode === "off" ? (
          <OffMode createFood={createFood} onCreated={onCreated} />
        ) : (
          <ManualMode createFood={createFood} onCreated={onCreated} />
        )}
      </div>
    </div>
  );
}

// ---- Mode OpenFoodFacts ----
function OffMode({
  createFood,
  onCreated,
}: {
  createFood: (b: Record<string, unknown>) => Promise<Food | null>;
  onCreated: (f: Food) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<OffCandidate[] | null>(null);
  const [adding, setAdding] = useState<number | null>(null);

  async function search() {
    if (query.trim().length < 2) return;
    setLoading(true);
    setCandidates(null);
    try {
      const res = await fetch(`/api/openfoodfacts?q=${encodeURIComponent(query.trim())}`);
      const data = res.ok ? await res.json() : { candidates: [] };
      setCandidates(data.candidates ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function add(c: OffCandidate, i: number) {
    setAdding(i);
    try {
      const food = await createFood({
        name: c.name,
        brand: c.brand,
        barcode: c.barcode,
        per_100g: c.per100,
        servingSizeG: c.servingSizeG,
        source: "openfoodfacts",
      });
      if (food) {
        toast.success(`« ${food.name} » ajouté`);
        onCreated(food);
      }
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]"
          />
          <input
            className="input pl-9"
            placeholder="Nom du produit ou code-barres…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "…" : "Chercher"}
        </button>
      </form>

      {candidates !== null &&
        (candidates.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted)]">
            Aucun résultat. Essaie un autre nom, un code-barres, ou passe en mode « Manuel ».
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {candidates.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-[color:var(--color-muted)]">
                    {fmt(c.per100.kcal)} kcal/100g · sucres {fmt(c.per100.sugarsG, 1)} g
                    {c.brand ? ` · ${c.brand}` : ""}
                  </span>
                </span>
                <button
                  onClick={() => add(c, i)}
                  disabled={adding === i}
                  className="btn btn-ghost shrink-0 px-2 py-1 text-sm"
                >
                  <Plus size={14} /> Ajouter
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

// ---- Mode manuel ----
function ManualMode({
  createFood,
  onCreated,
}: {
  createFood: (b: Record<string, unknown>) => Promise<Food | null>;
  onCreated: (f: Food) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    name: "",
    brand: "",
    servingSizeG: "",
    kcal: "",
    proteinG: "",
    carbsG: "",
    sugarsG: "",
    fatG: "",
    saturatedG: "",
    fiberG: "",
    saltG: "",
  });

  const upd = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    if (!form.kcal) {
      toast.error("Les kcal (pour 100 g) sont requises");
      return;
    }
    setSaving(true);
    try {
      const per_100g = Object.fromEntries(
        MACRO_FIELDS.map(({ key }) => [key, num(form[key])]),
      );
      const food = await createFood({
        name: form.name.trim(),
        brand: form.brand || null,
        servingSizeG: form.servingSizeG ? num(form.servingSizeG) : null,
        per_100g,
        source: "manual",
      });
      if (food) {
        toast.success(`« ${food.name} » créé`);
        onCreated(food);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Nom *</span>
        <input className="input" value={form.name} onChange={(e) => upd("name", e.target.value)} autoFocus />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Marque</span>
          <input className="input" value={form.brand} onChange={(e) => upd("brand", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Portion (g)</span>
          <input className="input" inputMode="decimal" value={form.servingSizeG} onChange={(e) => upd("servingSizeG", e.target.value)} />
        </label>
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">Valeurs pour 100 g (kcal requis) :</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MACRO_FIELDS.map(({ key, label }) => (
          <label key={key}>
            <span className="mb-1 block text-xs text-[color:var(--color-muted)]">
              {label}
              {key === "kcal" ? " *" : ""}
            </span>
            <input
              className="input"
              inputMode="decimal"
              value={form[key]}
              onChange={(e) => upd(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <button onClick={submit} disabled={saving} className="btn btn-primary w-full">
        {saving ? "Création…" : "Créer l’aliment"}
      </button>
    </div>
  );
}
