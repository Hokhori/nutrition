import { isRequestAuthorized, unauthorized, errorResponse } from "@/lib/api-guard";
import { getFood, updateFood } from "@/lib/services";
import { updateFoodSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const { id } = await ctx.params;
    const food = await getFood(Number(id));
    if (!food) return Response.json({ error: "Aliment introuvable" }, { status: 404 });
    return Response.json(food);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isRequestAuthorized(req))) return unauthorized();
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const patch = updateFoodSchema.parse(body);
    const food = await updateFood(Number(id), patch);
    if (!food) return Response.json({ error: "Aliment introuvable" }, { status: 404 });
    return Response.json(food);
  } catch (e) {
    return errorResponse(e);
  }
}
