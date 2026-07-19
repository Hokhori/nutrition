import { isRequestAuthorized, unauthorized, errorResponse } from "@/lib/api-guard";
import { getDailySummary } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    return Response.json(await getDailySummary(date));
  } catch (e) {
    return errorResponse(e);
  }
}
