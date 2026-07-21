import { getSessionUser } from "@/lib/auth";
import { unauthorized, errorResponse } from "@/lib/api-guard";
import { exportUserData } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Export RGPD (accès + portabilité) : télécharge toutes les données de l'utilisateur en JSON. */
export async function GET() {
  const su = await getSessionUser();
  if (!su) return unauthorized();
  try {
    const data = await exportUserData(su.userId);
    if (!data) return unauthorized();
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="nutrition-export-${su.userId}.json"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
