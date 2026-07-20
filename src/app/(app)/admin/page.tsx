import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listUsers, getAppConfig } from "@/lib/services";
import { AdminPanel } from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  if (su.role !== "admin") redirect("/");
  const [users, config] = await Promise.all([listUsers(), getAppConfig()]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Administration</h1>
      <AdminPanel initialUsers={users} requireApproval={config.requireApproval} currentUserId={su.userId} />
    </div>
  );
}
