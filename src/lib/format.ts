// Helpers de formatage — sûrs côté client et serveur (pas de "server-only").

export const MEAL_LABELS: Record<string, string> = {
  "petit-dej": "Petit-déj",
  dej: "Déjeuner",
  diner: "Dîner",
  snack: "Snack",
};

export function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtG(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${fmt(n, n < 10 ? 1 : 0)} g`;
}

export function frDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export const MACROS: { key: string; label: string; unit: "g" }[] = [
  { key: "proteinG", label: "Protéines", unit: "g" },
  { key: "carbsG", label: "Glucides", unit: "g" },
  { key: "sugarsG", label: "Sucres", unit: "g" },
  { key: "fatG", label: "Lipides", unit: "g" },
  { key: "saturatedG", label: "Saturés", unit: "g" },
  { key: "fiberG", label: "Fibres", unit: "g" },
  { key: "saltG", label: "Sel", unit: "g" },
];
