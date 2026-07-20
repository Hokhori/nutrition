import { getSessionUser } from "@/lib/auth";
import { unauthorized, errorResponse } from "@/lib/api-guard";
import { getUserById, setUserStatus, setUserRole, deleteUser, countAdmins } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const su = await getSessionUser();
  if (!su || su.role !== "admin") return unauthorized();
  try {
    const { id } = await ctx.params;
    const userId = Number(id);
    const target = await getUserById(userId);
    if (!target) return Response.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const body = await req.json();
    if (body.status === "active" || body.status === "pending") {
      await setUserStatus(userId, body.status);
    }
    if (body.role === "admin" || body.role === "user") {
      // Ne pas rétrograder le dernier admin.
      if (body.role === "user" && target.role === "admin" && (await countAdmins()) <= 1) {
        return Response.json({ error: "Impossible : dernier administrateur." }, { status: 400 });
      }
      await setUserRole(userId, body.role);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const su = await getSessionUser();
  if (!su || su.role !== "admin") return unauthorized();
  try {
    const { id } = await ctx.params;
    const userId = Number(id);
    const target = await getUserById(userId);
    if (!target) return Response.json({ error: "Utilisateur introuvable" }, { status: 404 });
    if (target.role === "admin" && (await countAdmins()) <= 1) {
      return Response.json({ error: "Impossible : dernier administrateur." }, { status: 400 });
    }
    await deleteUser(userId);
    return Response.json({ deleted: true });
  } catch (e) {
    return errorResponse(e);
  }
}
