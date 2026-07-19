import { isRequestAuthorized, unauthorized, errorResponse } from "@/lib/api-guard";
import { deleteEntry } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const { id } = await ctx.params;
    const okDel = await deleteEntry(Number(id));
    if (!okDel) return Response.json({ error: "Apport introuvable" }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (e) {
    return errorResponse(e);
  }
}
