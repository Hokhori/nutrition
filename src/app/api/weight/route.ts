import { getCurrentUserId, unauthorized, errorResponse } from "@/lib/api-guard";
import { logWeight, getProgress } from "@/lib/services";
import { logWeightSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorized();
  try {
    return Response.json(await getProgress(userId));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorized();
  try {
    const body = await req.json();
    const input = logWeightSchema.parse(body);
    const row = await logWeight(userId, input);
    return Response.json(row, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
