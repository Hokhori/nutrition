import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSettings, computeTargets } from "@/lib/services";
import { GoalForm } from "@/components/GoalForm";

export const dynamic = "force-dynamic";

export default async function GoalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [settings, targets] = await Promise.all([
    getSettings(user.userId),
    computeTargets(user.userId),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Objectif & profil</h1>
      <GoalForm
        settings={{
          sex: settings.sex,
          birthYear: settings.birthYear,
          heightCm: settings.heightCm,
          activityLevel: settings.activityLevel,
          targetWeightKg: settings.targetWeightKg,
          weeklyRateKg: settings.weeklyRateKg,
          manualKcalTarget: settings.manualKcalTarget,
          proteinTargetG: settings.proteinTargetG,
        }}
        currentWeightKg={targets.currentWeightKg}
        target={targets.target}
      />
    </div>
  );
}
