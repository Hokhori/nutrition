import { fmt } from "@/lib/format";

export function KcalRing({
  consumed,
  target,
}: {
  consumed: number;
  target: number | null;
}) {
  const size = 176;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target ? Math.min(consumed / target, 1) : 0;
  const over = target ? consumed > target : false;
  const remaining = target ? target - consumed : null;
  const color = over ? "var(--color-danger)" : "var(--color-brand)";

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        {target && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
          />
        )}
      </svg>
      <div className="absolute text-center">
        {target ? (
          <>
            <div className="text-3xl font-bold">{fmt(Math.abs(remaining ?? 0))}</div>
            <div className="text-xs text-[color:var(--color-muted)]">
              {over ? "kcal au-dessus" : "kcal restantes"}
            </div>
            <div className="mt-1 text-xs text-[color:var(--color-muted)]">
              {fmt(consumed)} / {fmt(target)}
            </div>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold">{fmt(consumed)}</div>
            <div className="text-xs text-[color:var(--color-muted)]">kcal consommées</div>
            <div className="mt-1 text-xs text-[color:var(--color-warn)]">Objectif à définir</div>
          </>
        )}
      </div>
    </div>
  );
}
