import { fmt } from "@/lib/format";

export function MacroBar({
  label,
  value,
  target,
  kind = "target",
}: {
  label: string;
  value: number;
  target: number | null;
  kind?: "target" | "limit";
}) {
  const pct = target ? Math.min((value / target) * 100, 100) : 0;
  const over = target ? value > target : false;
  // Pour une "limite" (sucres, saturés, sel), dépasser est mauvais (rouge).
  // Pour une "cible" (protéines), en dessous n'est pas alarmant (brand).
  const barColor = over
    ? kind === "limit"
      ? "var(--color-danger)"
      : "var(--color-brand)"
    : "var(--color-brand)";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-[color:var(--color-muted)]">{label}</span>
        <span>
          <span className="font-medium">{fmt(value, value < 10 ? 1 : 0)}</span>
          {target !== null && (
            <span className="text-[color:var(--color-muted)]">
              {" "}
              / {fmt(target)} g{kind === "limit" ? " max" : ""}
            </span>
          )}
          {target === null && <span className="text-[color:var(--color-muted)]"> g</span>}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[color:var(--color-surface-2)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
