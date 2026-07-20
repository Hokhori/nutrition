import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AssistantChat } from "@/components/AssistantChat";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Assistant</h1>
      <AssistantChat />
    </div>
  );
}
