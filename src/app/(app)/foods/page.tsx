import { listFoods } from "@/lib/services";
import { FoodsManager } from "@/components/FoodsManager";

export const dynamic = "force-dynamic";

export default async function FoodsPage() {
  const foods = await listFoods(300);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Aliments</h1>
      <FoodsManager initial={foods} />
    </div>
  );
}
