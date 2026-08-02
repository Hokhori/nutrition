import { fmt } from "@/lib/format";
import { trackPosition, type CalorieZones, type ZoneStatus } from "@/lib/calorie-zones";

const HEIGHT = 260; // hauteur de la piste, en px
const TRACK_W = 22;

/** Hauteur minimale d'un palier (px) pour afficher son libellé / sa plage. */
const MIN_H_LABEL = 24;
const MIN_H_RANGE = 40;

const STATUS_COLOR: Record<ZoneStatus, string> = {
  good: "var(--color-brand)",
  caution: "var(--color-warn)",
  alert: "var(--color-alert)",
  danger: "var(--color-danger)",
};

function rangeLabel(min: number, max: number | null): string {
  if (min <= 0) return `< ${fmt(max)}`;
  if (max === null) return `> ${fmt(min)}`;
  return `${fmt(min)} – ${fmt(max)}`;
}

/**
 * Jauge verticale des paliers caloriques du jour.
 *
 * La portion atteinte est en couleur pleine, le reste est estompé — la
 * progression de la journée se lit comme un remplissage. Deux repères
 * horizontaux : la consommation actuelle et le cap visé. L'échelle est
 * linéaire par morceaux (cf. trackPosition) ; les bornes exactes en kcal sont
 * affichées en face de chaque palier.
 */
export function KcalGauge({ zones, isToday }: { zones: CalorieZones; isToday: boolean }) {
  const { scaleMaxKcal: scaleMax, consumedKcal, targetKcal, currentIndex, current } = zones;

  const pctOf = (kcal: number) => trackPosition(zones, kcal) * 100;
  const fillPct = pctOf(consumedKcal);
  const targetPct = targetKcal !== null ? pctOf(targetKcal) : null;

  const segments = zones.zones.map((z) => {
    const top = z.max ?? scaleMax;
    return {
      zone: z,
      bottomPct: pctOf(z.min),
      heightPct: pctOf(top) - pctOf(z.min),
      heightPx: ((pctOf(top) - pctOf(z.min)) / 100) * HEIGHT,
    };
  });

  // Les barres colorées, réutilisées deux fois : une fois estompées (piste),
  // une fois en couleur pleine à l'intérieur du masque de remplissage.
  const bars = (dim: boolean) =>
    segments.map(({ zone, bottomPct, heightPct }) => (
      <div
        key={zone.key}
        className="absolute inset-x-0"
        style={{
          bottom: `${bottomPct}%`,
          height: `${heightPct}%`,
          background: STATUS_COLOR[zone.status],
          opacity: dim ? 0.2 : 1,
        }}
      />
    ));

  return (
    <div className="flex select-none items-stretch gap-2" style={{ height: HEIGHT }}>
      {/* Piste */}
      <div className="relative shrink-0 rounded-full" style={{ width: TRACK_W }}>
        <div className="absolute inset-0 overflow-hidden rounded-full">{bars(true)}</div>

        {/* Portion atteinte : masque qui laisse voir les barres pleines */}
        <div
          className="absolute inset-x-0 bottom-0 overflow-hidden rounded-full"
          style={{ height: `${fillPct}%` }}
        >
          <div className="absolute inset-x-0 bottom-0" style={{ height: HEIGHT }}>
            {bars(false)}
          </div>
        </div>

        {/* Repère du cap visé */}
        {targetPct !== null && (
          <div
            className="pointer-events-none absolute -inset-x-1 border-t border-dashed border-[color:var(--color-fg)] opacity-70"
            style={{ bottom: `${targetPct}%` }}
          />
        )}

        {/* Repère de la consommation actuelle */}
        <div
          className="pointer-events-none absolute -inset-x-1.5"
          style={{ bottom: `${fillPct}%` }}
        >
          <div className="h-0.5 -translate-y-1/2 rounded-full bg-[color:var(--color-fg)]" />
        </div>
      </div>

      {/* Libellés des paliers, alignés sur le centre de chaque segment */}
      <div className="relative flex-1" style={{ minWidth: 74 }}>
        {segments.map(({ zone, bottomPct, heightPct, heightPx }, i) => {
          const isCurrent = i === currentIndex;
          if (heightPx < MIN_H_LABEL && !isCurrent) return null;
          return (
            <div
              key={zone.key}
              className="absolute inset-x-0 flex flex-col justify-center"
              style={{ bottom: `${bottomPct}%`, height: `${heightPct}%` }}
            >
              <div
                className="text-[10px] leading-tight"
                style={{
                  color: isCurrent ? STATUS_COLOR[zone.status] : "var(--color-muted)",
                  fontWeight: isCurrent ? 700 : 500,
                }}
              >
                {zone.label}
              </div>
              {heightPx >= MIN_H_RANGE && (
                <div className="text-[9px] leading-tight text-[color:var(--color-muted)] opacity-70">
                  {rangeLabel(zone.min, zone.max)}
                </div>
              )}
            </div>
          );
        })}

        {/* Rappel du cap visé, aligné sur son repère */}
        {targetPct !== null && (
          <div
            className="absolute inset-x-0 -translate-y-1/2 text-[9px] leading-none text-[color:var(--color-fg)] opacity-80"
            style={{ bottom: `${targetPct}%` }}
          >
            🎯 {fmt(targetKcal)}
          </div>
        )}
      </div>

      <span className="sr-only">
        {fmt(consumedKcal)} kcal consommées — palier {current.label}. {current.hint}
      </span>
      <span className="sr-only">{isToday ? "Journée en cours." : "Journée terminée."}</span>
    </div>
  );
}

/**
 * Lecture textuelle du palier courant, à afficher sous la jauge.
 *
 * Nuance importante : en cours de journée on est mécaniquement sous le
 * plancher métabolique (on n'a pas encore mangé). On n'alerte donc que sur une
 * journée passée ; pour aujourd'hui on affiche ce qu'il reste à manger.
 */
export function KcalZoneStatus({ zones, isToday }: { zones: CalorieZones; isToday: boolean }) {
  const { current, floorKcal, floorIsEstimate, consumedKcal, targetKcal, direction } = zones;
  const belowFloor = current.key === "under_floor";
  const pending = isToday && belowFloor;
  const color = STATUS_COLOR[current.status];

  return (
    <div className="mt-4 space-y-1.5 border-t border-[color:var(--color-border)] pt-3 text-sm">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ color, background: `color-mix(in srgb, ${color} 18%, transparent)` }}
        >
          {pending ? "Journée en cours" : current.label}
        </span>
        <span className="text-[color:var(--color-muted)]">
          {pending ? (
            <>
              encore{" "}
              <span className="font-semibold text-[color:var(--color-fg)]">
                {fmt(floorKcal - consumedKcal)} kcal
              </span>{" "}
              avant ton plancher métabolique
            </>
          ) : (
            current.hint
          )}
        </span>
      </div>
      <div className="text-center text-xs text-[color:var(--color-muted)]">
        Plancher {fmt(floorKcal)} kcal
        {floorIsEstimate ? " (estimé — complète ton profil)" : " (métabolisme de base)"} · Dépense
        estimée {fmt(zones.maintenanceKcal)} kcal
        {targetKcal !== null && (
          <>
            {" "}
            · Cap visé{" "}
            <span className="font-semibold text-[color:var(--color-fg)]">
              {fmt(targetKcal)} kcal
            </span>
            {direction === "gain" ? " 📈" : direction === "loss" ? " 📉" : ""}
          </>
        )}
      </div>
      {!pending && belowFloor && (
        <div className="text-center text-xs text-[color:var(--color-danger)]">
          ⚠️ Sous {fmt(floorKcal)} kcal durablement = risque d’effet inverse (métabolisme qui
          ralentit).
        </div>
      )}
    </div>
  );
}
