import { isRequestAuthorized, unauthorized, errorResponse } from "@/lib/api-guard";
import { lookup } from "@/lib/openfoodfacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    if (!q) return Response.json({ candidates: [] });
    const limit = Number(url.searchParams.get("limit")) || 5;
    const candidates = await lookup(q, limit);
    return Response.json({ candidates });
  } catch (e) {
    return errorResponse(e);
  }
}
