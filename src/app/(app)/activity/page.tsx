import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDailySummary, computeTargets } from "@/lib/services";
import { ActivityPanel } from "@/components/ActivityPanel";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [summary, targets] = await Promise.all([
    getDailySummary(user.userId),
    computeTargets(user.userId),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Activité physique</h1>
      <ActivityPanel
        activities={summary.activities.map((a) => ({
          id: a.id,
          name: a.name,
          durationMin: a.durationMin,
          kcal: a.kcal,
        }))}
        currentWeightKg={targets.currentWeightKg}
        baseTargetKcal={summary.target.target}
        activityKcal={summary.activityKcal}
        effectiveTargetKcal={summary.effectiveTargetKcal}
      />
    </div>
  );
}
