import { getSessionUser } from "@/lib/auth";
import { unauthorized, errorResponse } from "@/lib/api-guard";
import { setRequireApproval } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const su = await getSessionUser();
  if (!su || su.role !== "admin") return unauthorized();
  try {
    const body = await req.json();
    await setRequireApproval(Boolean(body.requireApproval));
    return Response.json({ ok: true, requireApproval: Boolean(body.requireApproval) });
  } catch (e) {
    return errorResponse(e);
  }
}
