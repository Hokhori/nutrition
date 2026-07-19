import "server-only";
import { checkBearerToken, isAuthenticated } from "./auth";
import { ServiceError } from "./services";
import { ZodError } from "zod";

/** Autorise si un token Bearer valide OU une session web authentifiée. */
export async function isRequestAuthorized(req: Request): Promise<boolean> {
  if (checkBearerToken(req)) return true;
  return isAuthenticated();
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
