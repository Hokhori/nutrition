import "server-only";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

// --- Config ---------------------------------------------------------------

export function publicUrl(): string {
  return (process.env.PUBLIC_URL || "https://nutrition.hokhori.be").replace(/\/$/, "");
}
export function issuer(): string {
  return publicUrl();
}
export function resourceUrl(): string {
  return `${publicUrl()}/mcp`;
}
export function clientId(): string {
  return process.env.OAUTH_CLIENT_ID || "";
}
function clientSecret(): string {
  return process.env.OAUTH_CLIENT_SECRET || "";
}
function jwtSecret(): string {
  // Secret dédié si présent, sinon repli sur le secret de session.
  return process.env.OAUTH_JWT_SECRET || process.env.SESSION_SECRET || "";
}

/** Redirections autorisées : uniquement les domaines Claude en HTTPS. */
export function isAllowedRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return (
      host === "claude.ai" ||
      host === "claude.com" ||
      host.endsWith(".claude.ai") ||
      host.endsWith(".claude.com")
    );
  } catch {
    return false;
  }
}

/** Vérifie les identifiants client (client_secret_post ou client_secret_basic). */
export function verifyClient(id: string | null, secret: string | null): boolean {
  const expId = clientId();
  const expSecret = clientSecret();
  if (!expId || !expSecret || !id || !secret) return false;
  return safeEq(id, expId) && safeEq(secret, expSecret);
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// --- JWT (HS256, sans dépendance) -----------------------------------------

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

type TokenType = "access" | "refresh";

function signJwt(payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = createHmac("sha256", jwtSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyJwt(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const expected = createHmac("sha256", jwtSecret()).update(`${h}.${b}`).digest("base64url");
  if (!safeEq(s, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    if (typeof payload.exp === "number" && payload.exp < Math.floor(nowSec())) return null;
    return payload;
  } catch {
    return null;
  }
}

function nowSec(): number {
  return Date.now() / 1000;
}

const ACCESS_TTL = 3600; // 1 h
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 j

export function issueTokens(sub: string): {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
} {
  const iat = Math.floor(nowSec());
  const base = { sub, iss: issuer(), aud: resourceUrl(), iat, scope: "mcp" };
  const access = signJwt({ ...base, typ: "access" as TokenType, exp: iat + ACCESS_TTL });
  const refresh = signJwt({ ...base, typ: "refresh" as TokenType, exp: iat + REFRESH_TTL });
  return {
    access_token: access,
    refresh_token: refresh,
    token_type: "Bearer",
    expires_in: ACCESS_TTL,
    scope: "mcp",
  };
}

/** Vérifie un access token OAuth ; renvoie le sub ou null. */
export function verifyAccessToken(token: string): string | null {
  const p = verifyJwt(token);
  if (!p || p.typ !== "access") return null;
  return typeof p.sub === "string" ? p.sub : null;
}

export function verifyRefreshToken(token: string): string | null {
  const p = verifyJwt(token);
  if (!p || p.typ !== "refresh") return null;
  return typeof p.sub === "string" ? p.sub : null;
}

// --- Codes d'autorisation (éphémères, en mémoire) -------------------------

type CodeEntry = { codeChallenge: string; redirectUri: string; clientId: string; exp: number };
const globalForCodes = globalThis as unknown as { _oauthCodes?: Map<string, CodeEntry> };
const codes: Map<string, CodeEntry> = globalForCodes._oauthCodes ?? new Map();
globalForCodes._oauthCodes = codes;

export function createAuthCode(params: {
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
}): string {
  const code = randomBytes(32).toString("base64url");
  codes.set(code, {
    ...params,
    exp: nowSec() + 600, // 10 min
  });
  return code;
}

export function consumeAuthCode(
  code: string,
): { codeChallenge: string; redirectUri: string; clientId: string } | null {
  const entry = codes.get(code);
  if (!entry) return null;
  codes.delete(code); // usage unique
  if (entry.exp < nowSec()) return null;
  return entry;
}

/** Vérifie PKCE S256 : base64url(sha256(verifier)) === challenge. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return safeEq(computed, challenge);
}
