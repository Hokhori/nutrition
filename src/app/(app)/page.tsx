import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDailySummary } from "@/lib/services";
import { resolveDate, todayISO, addDaysISO } from "@/lib/date";
import { frDate, fmt } from "@/lib/format";
import { KcalRing } from "@/components/KcalRing";
import { MacroBar } from "@/components/MacroBar";
import { QuickAdd } from "@/components/QuickAdd";
import { EntryList } from "@/components/EntryList";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const date = resolveDate(sp.date);
  const today = todayISO();
  const summary = await getDailySummary(user.userId, date);
  const { totals, macros, target } = summary;
  const min = summary.minKcal;
  const cap = summary.effectiveTargetKcal;
  const showZone = min !== null && cap !== null;
  const capAboveFloor = min !== null && cap !== null && cap > min;
  const showActivity = summary.activityKcal > 0 && target.target !== null;
  const showSedentary =
    summary.sedentaryKcal !== null &&
    target.target !== null &&
    !target.manual &&
    summary.sedentaryKcal !== target.target &&
    summary.activityKcal === 0 &&
    // On masque le repère sédentaire s'il passe sous le plancher (non conseillé).
    (min === null || summary.sedentaryKcal >= min);

  return (
    <div className="space-y-5">
      {/* Navigation de date */}
      <div className="flex items-center justify-between">
        <Link href={`/?date=${addDaysISO(date, -1)}`} className="btn-ghost rounded-lg p-2">
          <ChevronLeft size={18} />
        </Link>
        <div className="text-center">
          <div className="font-semibold capitalize">
            {date === today ? "Aujourd’hui" : frDate(date)}
          </div>
          {date !== today && <div className="text-xs text-[color:var(--color-muted)]">{date}</div>}
        </div>
        <Link
          href={`/?date=${addDaysISO(date, 1)}`}
          className={`btn-ghost rounded-lg p-2 ${date >= today ? "pointer-events-none opacity-30" : ""}`}
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      {/* Anneau calorique + macros */}
      <div className="card p-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <KcalRing consumed={totals.kcal} target={summary.effectiveTargetKcal} />
          <div className="w-full flex-1 space-y-2.5">
            <MacroBar label="Protéines" value={totals.proteinG} target={macros.proteinG} />
            <MacroBar label="Glucides" value={totals.carbsG} target={macros.carbsG} />
            <MacroBar label="Sucres ajoutés" value={totals.addedSugarsG} target={macros.sugarsMaxG} kind="limit" />
            <MacroBar label="Lipides" value={totals.fatG} target={macros.fatG} />
            <MacroBar label="Saturés" value={totals.saturatedG} target={macros.saturatedMaxG} kind="limit" />
            <MacroBar label="Fibres" value={totals.fiberG} target={macros.fiberMinG} />
            <MacroBar label="Sel" value={totals.saltG} target={macros.saltMaxG} kind="limit" />
          </div>
        </div>
        {target.direction === "gain" && cap !== null && (
          <div className="mt-4 flex flex-col items-center gap-0.5 border-t border-[color:var(--color-border)] pt-3 text-sm">
            <div className="flex flex-wrap items-center justify-center gap-x-2 text-[color:var(--color-muted)]">
              <span>📈 Objectif prise de poids — vise</span>
              <span className="font-semibold text-[color:var(--color-fg)]">{fmt(cap)} kcal</span>
            </div>
            <div className="text-xs text-[color:var(--color-muted)]">
              Surplus calorique quotidien pour prendre du poids progressivement
            </div>
          </div>
        )}
        {target.direction !== "gain" && showZone && (
          <div className="mt-4 flex flex-col items-center gap-0.5 border-t border-[color:var(--color-border)] pt-3 text-sm">
            {capAboveFloor ? (
              <div className="flex flex-wrap items-center justify-center gap-x-2 text-[color:var(--color-muted)]">
                <span>🎯 Zone conseillée</span>
                <span className="font-semibold text-[color:var(--color-fg)]">
                  {fmt(min)} – {fmt(cap)} kcal
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-x-2 text-[color:var(--color-muted)]">
                <span>🔻 Vise au moins</span>
                <span className="font-semibold text-[color:var(--color-fg)]">{fmt(min)} kcal</span>
                <span>aujourd’hui (plancher métabolique)</span>
              </div>
            )}
            <div className="text-xs text-[color:var(--color-muted)]">
              Sous {fmt(min)} kcal (métabolisme de base) durablement = risque d’effet inverse
            </div>
          </div>
        )}
        {showActivity && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 pt-1 text-sm text-[color:var(--color-muted)]">
            <span>🔥 +{fmt(summary.activityKcal)} kcal sport → cap ajusté</span>
            <span className="font-semibold text-[color:var(--color-fg)]">
              {fmt(summary.effectiveTargetKcal)} kcal
            </span>
          </div>
        )}
        {showSedentary && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-t border-[color:var(--color-border)] pt-3 text-sm text-[color:var(--color-muted)]">
            <span>🛋️ Journée sédentaire (sans activité) :</span>
            <span className="font-semibold text-[color:var(--color-fg)]">
              {fmt(summary.sedentaryKcal)} kcal
            </span>
            <span>({fmt(summary.sedentaryKcal! - target.target!)} kcal)</span>
          </div>
        )}
      </div>

      {/* Ajout rapide */}
      <QuickAdd date={date} />

      {/* Journal du jour */}
      <EntryList entries={summary.entries} />
    </div>
  );
}
