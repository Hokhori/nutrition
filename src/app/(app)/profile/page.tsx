import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserById } from "@/lib/services";
import { oauthClientInfo } from "@/lib/oauth";
import { McpSetup } from "@/components/McpSetup";
import { AccountData } from "@/components/AccountData";
import { logoutAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const user = await getUserById(su.userId);
  if (!user) redirect("/login");
  const oauth = oauthClientInfo();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Profil</h1>
        <form action={logoutAction}>
          <button className="btn btn-ghost text-sm">Déconnexion</button>
        </form>
      </div>

      <div className="card p-4">
        <div className="text-sm text-[color:var(--color-muted)]">Connecté en tant que</div>
        <div className="font-medium">{user.email}</div>
        <div className="mt-1 text-xs text-[color:var(--color-muted)]">Rôle : {user.role}</div>
      </div>

      <McpSetup
        mcpUrl={oauth.mcpUrl}
        mcpToken={user.mcpToken}
        oauthClientId={oauth.clientId}
        oauthClientSecret={oauth.clientSecret}
      />

      <AccountData email={user.email} />
    </div>
  );
}
