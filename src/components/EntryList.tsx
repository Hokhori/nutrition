"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { MEAL_LABELS, fmt } from "@/lib/format";

type Entry = {
  id: number;
  name: string;
  brand: string | null;
  quantityG: number;
  meal: string | null;
  nutrients: {
    kcal: number;
    proteinG: number;
    carbsG: number;
    sugarsG: number;
    addedSugarsG: number;
    fatG: number;
    saturatedG: number;
    fiberG: number;
    saltG: number;
  };
};

const g = (n: number) => `${fmt(n, n < 10 ? 1 : 0)} g`;

const MEAL_ORDER = ["petit-dej", "dej", "diner", "snack", "_none"];

export function EntryList({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<number | null>(null);

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[color:var(--color-muted)]">
        Aucun apport enregistré pour ce jour.
      </p>
    );
  }

  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = e.meal ?? "_none";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  async function remove(id: number) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Apport supprimé");
      router.refresh();
    } catch {
      toast.error("Suppression impossible");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {MEAL_ORDER.filter((k) => groups.has(k)).map((k) => (
        <div key={k}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
            {k === "_none" ? "Autres" : MEAL_LABELS[k]}
          </h3>
          <ul className="card divide-y divide-[color:var(--color-border)]">
            {groups.get(k)!.map((e) => (
              <li key={e.id} className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.name}</div>
                    <div className="text-xs text-[color:var(--color-muted)]">
                      {fmt(e.quantityG)} g{e.brand ? ` · ${e.brand}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold">{fmt(e.nutrients.kcal)} kcal</div>
                  <button
                    onClick={() => remove(e.id)}
                    disabled={deleting === e.id}
                    className="btn-danger rounded-lg p-1.5"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {/* Contribution macro de cet aliment */}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[color:var(--color-muted)]">
                  <span>Prot. {g(e.nutrients.proteinG)}</span>
                  <span>Gluc. {g(e.nutrients.carbsG)}</span>
                  <span className="text-[color:var(--color-warn)]">
                    Sucres {g(e.nutrients.sugarsG)}
                    {e.nutrients.addedSugarsG > 0 && ` (dont ajoutés ${g(e.nutrients.addedSugarsG)})`}
                  </span>
                  <span>Fibres {g(e.nutrients.fiberG)}</span>
                  <span>Lip. {g(e.nutrients.fatG)}</span>
                  <span>Sat. {g(e.nutrients.saturatedG)}</span>
                  <span>Sel {g(e.nutrients.saltG)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
