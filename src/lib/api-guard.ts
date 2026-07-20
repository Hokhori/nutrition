import "server-only";
import { verifyMcpBearer, getSessionUser } from "./auth";
import { verifyAccessToken } from "./oauth";
import {
  ServiceError,
  getUserByMcpToken,
  getUserById,
  getFirstAdminId,
} from "./services";
import { ZodError } from "zod";

/**
 * Résout l'utilisateur courant depuis :
 *  1) un Bearer = MCP_TOKEN env (→ admin), un mcp_token perso, ou un access token OAuth ;
 *  2) sinon la session web.
 * Renvoie l'id user, ou null si non authentifié.
 */
/** Résout l'user depuis un token Bearer (env admin / mcp_token perso / OAuth). */
export async function resolveBearerUserId(token: string): Promise<number | null> {
  // Token statique env (rétrocompat Mac/CI) → admin.
  if (verifyMcpBearer(token)) {
    const adminId = await getFirstAdminId();
    if (adminId) return adminId;
  }
  // Token MCP personnel d'un utilisateur.
  const byToken = await getUserByMcpToken(token);
  if (byToken && byToken.status === "active") return byToken.id;
  // Access token OAuth (sub = userId).
  const sub = verifyAccessToken(token);
  if (sub) {
    const id = Number(sub);
    if (Number.isInteger(id)) {
      const u = await getUserById(id);
      if (u && u.status === "active") return u.id;
    }
  }
  return null;
}

export async function getCurrentUserId(req: Request): Promise<number | null> {
  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (m) return resolveBearerUserId(m[1].trim());
  const su = await getSessionUser();
  return su?.userId ?? null;
}

export function unauthorized() {
  return Response.json({ error: "Non autorisé" }, { status: 401 });
}

/** Convertit une erreur en réponse JSON adaptée (validation, métier, générique). */
export function errorResponse(e: unknown) {
  if (e instanceof ZodError) {
    return Response.json({ error: "Entrée invalide", issues: e.issues }, { status: 400 });
  }
  if (e instanceof ServiceError) {
    const status = e.code === "food_not_found" ? 404 : 400;
    return Response.json({ error: e.message, code: e.code }, { status });
  }
  console.error(e);
  return Response.json({ error: "Erreur interne" }, { status: 500 });
}
