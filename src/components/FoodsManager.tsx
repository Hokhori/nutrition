"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import { fmt } from "@/lib/format";

type Food = {
  id: number;
  name: string;
  brand: string | null;
  barcode: string | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  sugarsG: number;
  fatG: number;
  saturatedG: number;
  fiberG: number;
  saltG: number;
  servingSizeG: number | null;
  source: string | null;
};

const MACRO_FIELDS: { key: keyof Food; label: string }[] = [
  { key: "kcal", label: "kcal" },
  { key: "proteinG", label: "Protéines" },
  { key: "carbsG", label: "Glucides" },
  { key: "sugarsG", label: "Sucres" },
  { key: "fatG", label: "Lipides" },
  { key: "saturatedG", label: "Saturés" },
  { key: "fiberG", label: "Fibres" },
  { key: "saltG", label: "Sel" },
];

export function FoodsManager({ initial }: { initial: Food[] }) {
  const [foods, setFoods] = useState<Food[]>(initial);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Food | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const url = query.trim() ? `/api/foods?q=${encodeURIComponent(query.trim())}` : `/api/foods`;
      const res = await fetch(url);
      if (res.ok) setFoods(await res.json());
    }, 300);
  }, [query]);

  return (
    <div className="space-y-3">
      <input
        className="input"
        placeholder="Filtrer les aliments…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {foods.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--color-muted)]">
          Aucun aliment. Ils s’ajoutent via l’ajout rapide (OpenFoodFacts) ou par Claude via le MCP.
        </p>
      ) : (
        <ul className="card divide-y divide-[color:var(--color-border)]">
          {foods.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{f.name}</div>
                <div className="text-xs text-[color:var(--color-muted)]">
                  {fmt(f.kcal)} kcal · P {fmt(f.proteinG)} · G {fmt(f.carbsG)} · L {fmt(f.fatG)} /100g
                  {f.brand ? ` · ${f.brand}` : ""}
                </div>
              </div>
              <button onClick={() => setEditing(f)} className="btn-ghost rounded-lg p-1.5" aria-label="Éditer">
                <Pencil size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <FoodEditor
          food={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setFoods((list) => list.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function FoodEditor({
  food,
  onClose,
  onSaved,
}: {
  food: Food;
  onClose: () => void;
  onSaved: (f: Food) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {
      name: food.name,
      brand: food.brand ?? "",
      servingSizeG: food.servingSizeG?.toString() ?? "",
    };
    for (const { key } of MACRO_FIELDS) o[key] = String(food[key] ?? 0);
    return o;
  });

  function upd(k: string, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        name: form.name,
        brand: form.brand || null,
        servingSizeG: form.servingSizeG ? parseFloat(form.servingSizeG.replace(",", ".")) : null,
      };
      for (const { key } of MACRO_FIELDS) {
        patch[key] = parseFloat(String(form[key]).replace(",", ".")) || 0;
      }
      const res = await fetch(`/api/foods/${food.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const updated: Food = await res.json();
      toast.success("Aliment mis à jour");
      onSaved(updated);
    } catch {
      toast.error("Mise à jour impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Éditer l’aliment</h2>
          <button onClick={onClose} className="btn-ghost rounded-lg p-1.5">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[color:var(--color-muted)]">Nom</span>
            <input className="input" value={form.name} onChange={(e) => upd("name", e.target.value)} />
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
          <p className="text-xs text-[color:var(--color-muted)]">Valeurs pour 100 g :</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MACRO_FIELDS.map(({ key, label }) => (
              <label key={key}>
                <span className="mb-1 block text-xs text-[color:var(--color-muted)]">{label}</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(e) => upd(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <button onClick={save} disabled={saving} className="btn btn-primary w-full">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
