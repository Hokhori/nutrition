import { isRequestAuthorized, unauthorized, errorResponse } from "@/lib/api-guard";
import { logWeight, getProgress } from "@/lib/services";
import { logWeightSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    return Response.json(await getProgress());
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const body = await req.json();
    const input = logWeightSchema.parse(body);
    const row = await logWeight(input);
    return Response.json(row, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
