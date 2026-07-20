import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getProgress } from "@/lib/services";
import { WeightPanel } from "@/components/WeightPanel";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const progress = await getProgress(user.userId);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Progrès</h1>
      <WeightPanel progress={progress} />
    </div>
  );
}
