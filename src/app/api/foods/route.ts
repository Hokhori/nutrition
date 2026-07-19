import { isRequestAuthorized, unauthorized, errorResponse } from "@/lib/api-guard";
import { createFood, searchFoods, listFoods } from "@/lib/services";
import { createFoodSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    const limit = Number(url.searchParams.get("limit")) || undefined;
    const rows = q ? await searchFoods(q, limit ?? 20) : await listFoods(limit ?? 200);
    return Response.json(rows);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const body = await req.json();
    const input = createFoodSchema.parse(body);
    const food = await createFood(input);
    return Response.json(food, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
