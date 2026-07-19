import { isRequestAuthorized, unauthorized, errorResponse } from "@/lib/api-guard";
import { addActivity, listActivities } from "@/lib/services";
import { logActivitySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    return Response.json(await listActivities(date));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const body = await req.json();
    const input = logActivitySchema.parse(body);
    const activity = await addActivity(input);
    return Response.json(activity, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
