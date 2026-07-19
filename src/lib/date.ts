const DEFAULT_TZ = process.env.APP_TZ || "Europe/Brussels";

/** Jour courant "YYYY-MM-DD" dans le fuseau de l'app. */
export function todayISO(tz: string = DEFAULT_TZ): string {
  // 'en-CA' formate en YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(s: string): boolean {
  if (!ISO_RE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Normalise une date optionnelle en jour valide, défaut = aujourd'hui. */
export function resolveDate(input?: string | null): string {
  if (input && isValidISODate(input)) return input;
  return todayISO();
}

/** Décale une date ISO de n jours (n peut être négatif). */
export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
