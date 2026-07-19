import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { scryptSync, timingSafeEqual } from "node:crypto";

export type SessionData = {
  authenticated?: boolean;
};

// Options calculées à l'appel (pas au chargement du module) pour ne pas
// planter `next build` quand SESSION_SECRET est absent au build.
function buildSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET manquant ou < 32 caractères");
    }
  }
  return {
    password: password || "dev-only-insecure-secret-please-change-me-32+",
    cookieName: "nutrition_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
    },
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, buildSessionOptions());
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session.authenticated === true;
}

/** Vérifie un mot de passe contre WEB_PASSWORD_HASH (format scrypt$salt$hash). */
export function verifyWebPassword(input: string): boolean {
  const stored = process.env.WEB_PASSWORD_HASH;
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  const expected = Buffer.from(hashHex, "hex");
  let actual: Buffer;
  try {
    actual = scryptSync(input, salt, expected.length);
  } catch {
    return false;
  }
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Comparaison constante d'un token avec MCP_TOKEN. */
export function verifyMcpBearer(token?: string | null): boolean {
  const expected = process.env.MCP_TOKEN;
  if (!expected || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Idem à partir d'une requête (header Authorization: Bearer ...). */
export function checkBearerToken(req: Request): boolean {
  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  return verifyMcpBearer(m[1].trim());
}
