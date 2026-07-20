import { getSessionUser } from "@/lib/auth";
import { unauthorized, errorResponse } from "@/lib/api-guard";
import { listUsers, getAppConfig } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const su = await getSessionUser();
  if (!su || su.role !== "admin") return unauthorized();
  try {
    const [users, config] = await Promise.all([listUsers(), getAppConfig()]);
    return Response.json({ users, requireApproval: config.requireApproval });
  } catch (e) {
    return errorResponse(e);
  }
}
