"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Trash2, ShieldPlus, ShieldMinus } from "lucide-react";

type PublicUser = {
  id: number;
  email: string;
  role: "admin" | "user";
  status: "active" | "pending";
  createdAt: string;
};

export function AdminPanel({
  initialUsers,
  requireApproval,
  currentUserId,
}: {
  initialUsers: PublicUser[];
  requireApproval: boolean;
  currentUserId: number;
}) {
  const router = useRouter();
  const [approval, setApproval] = useState(requireApproval);
  const [busy, setBusy] = useState<number | null>(null);

  async function toggleApproval(value: boolean) {
    setApproval(value);
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requireApproval: value }),
    });
    if (!res.ok) {
      setApproval(!value);
      toast.error("Échec de la mise à jour");
    } else {
      toast.success(value ? "Validation requise activée" : "Inscription libre");
    }
  }

  async function patch(id: number, body: Record<string, unknown>, okMsg: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(okMsg);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number, email: string) {
    if (!confirm(`Supprimer ${email} et toutes ses données ?`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Utilisateur supprimé");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle validation */}
      <label className="card flex items-center justify-between p-4">
        <div>
          <div className="font-medium">Validation des comptes requise</div>
          <div className="text-xs text-[color:var(--color-muted)]">
            Si activé, les nouveaux inscrits doivent être approuvés avant de se connecter.
          </div>
        </div>
        <input
          type="checkbox"
          checked={approval}
          onChange={(e) => toggleApproval(e.target.checked)}
          className="h-5 w-5 accent-[color:var(--color-brand)]"
        />
      </label>

      {/* Liste users */}
      <ul className="card divide-y divide-[color:var(--color-border)]">
        {initialUsers.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {u.email}
                {u.id === currentUserId && (
                  <span className="ml-1 text-xs text-[color:var(--color-muted)]">(toi)</span>
                )}
              </div>
              <div className="flex gap-1.5 text-xs">
                <span
                  className={
                    u.role === "admin"
                      ? "text-[color:var(--color-brand)]"
                      : "text-[color:var(--color-muted)]"
                  }
                >
                  {u.role}
                </span>
                <span
                  className={
                    u.status === "pending"
                      ? "text-[color:var(--color-warn)]"
                      : "text-[color:var(--color-muted)]"
                  }
                >
                  · {u.status}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {u.status === "pending" && (
                <button
                  onClick={() => patch(u.id, { status: "active" }, "Compte approuvé")}
                  disabled={busy === u.id}
                  className="btn btn-ghost px-2 py-1 text-xs"
                  title="Approuver"
                >
                  <Check size={14} /> Approuver
                </button>
              )}
              {u.role === "user" ? (
                <button
                  onClick={() => patch(u.id, { role: "admin" }, "Promu admin")}
                  disabled={busy === u.id}
                  className="btn-ghost rounded-lg p-1.5"
                  title="Promouvoir admin"
                >
                  <ShieldPlus size={16} />
                </button>
              ) : (
                <button
                  onClick={() => patch(u.id, { role: "user" }, "Rétrogradé")}
                  disabled={busy === u.id || u.id === currentUserId}
                  className="btn-ghost rounded-lg p-1.5 disabled:opacity-30"
                  title="Retirer admin"
                >
                  <ShieldMinus size={16} />
                </button>
              )}
              <button
                onClick={() => remove(u.id, u.email)}
                disabled={busy === u.id || u.id === currentUserId}
                className="btn-danger rounded-lg p-1.5 disabled:opacity-30"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
