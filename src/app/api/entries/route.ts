import { isRequestAuthorized, unauthorized, errorResponse } from "@/lib/api-guard";
import { addEntry, listEntries } from "@/lib/services";
import { logFoodSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    return Response.json(await listEntries(date));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const body = await req.json();
    const input = logFoodSchema.parse(body);
    const entry = await addEntry(input);
    return Response.json(entry, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
