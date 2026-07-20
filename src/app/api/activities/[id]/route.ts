import { getCurrentUserId, unauthorized, errorResponse } from "@/lib/api-guard";
import { deleteActivity } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorized();
  try {
    const { id } = await ctx.params;
    const okDel = await deleteActivity(userId, Number(id));
    if (!okDel) return Response.json({ error: "Activité introuvable" }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (e) {
    return errorResponse(e);
  }
}
