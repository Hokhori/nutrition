import { getSessionUser } from "@/lib/auth";
import { unauthorized, errorResponse } from "@/lib/api-guard";
import { regenerateMcpToken } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const su = await getSessionUser();
  if (!su) return unauthorized();
  try {
    const token = await regenerateMcpToken(su.userId);
    return Response.json({ mcpToken: token });
  } catch (e) {
    return errorResponse(e);
  }
}
