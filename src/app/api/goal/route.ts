import { isRequestAuthorized, unauthorized, errorResponse } from "@/lib/api-guard";
import { getSettings, updateSettings, computeTargets } from "@/lib/services";
import { setGoalSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const [settings, targets] = await Promise.all([getSettings(), computeTargets()]);
    return Response.json({ settings, ...targets });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const body = await req.json();
    const patch = setGoalSchema.parse(body);
    const settings = await updateSettings(patch);
    const targets = await computeTargets();
    return Response.json({ settings, ...targets });
  } catch (e) {
    return errorResponse(e);
  }
}
