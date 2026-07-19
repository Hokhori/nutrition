import { getProgress } from "@/lib/services";
import { WeightPanel } from "@/components/WeightPanel";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const progress = await getProgress();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Progrès</h1>
      <WeightPanel progress={progress} />
    </div>
  );
}
