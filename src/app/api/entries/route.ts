import { getCurrentUserId, unauthorized, errorResponse } from "@/lib/api-guard";
import { addEntry, listEntries } from "@/lib/services";
import { logFoodSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorized();
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    return Response.json(await listEntries(userId, date));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorized();
  try {
    const body = await req.json();
    const input = logFoodSchema.parse(body);
    const entry = await addEntry(userId, input);
    return Response.json(entry, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
