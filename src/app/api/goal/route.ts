import { getCurrentUserId, unauthorized, errorResponse } from "@/lib/api-guard";
import { getSettings, updateSettings, computeTargets } from "@/lib/services";
import { setGoalSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorized();
  try {
    const [settings, targets] = await Promise.all([getSettings(userId), computeTargets(userId)]);
    return Response.json({ settings, ...targets });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorized();
  try {
    const body = await req.json();
    const patch = setGoalSchema.parse(body);
    const settings = await updateSettings(userId, patch);
    const targets = await computeTargets(userId);
    return Response.json({ settings, ...targets });
  } catch (e) {
    return errorResponse(e);
  }
}
