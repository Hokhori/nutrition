import { createMcpHandler, experimental_withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { registerTools } from "@/lib/mcp-tools";
import { verifyMcpBearer } from "@/lib/auth";
import { verifyAccessToken, publicUrl } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: { name: "nutrition", version: "1.0.0" },
  },
  {
    // basePath "/" => l'endpoint StreamableHTTP est "/mcp".
    basePath: "/",
    // SSE retiré de la spec (2025-03-26) : on ne garde que StreamableHTTP.
    disableSse: true,
    verboseLogs: false,
  },
);

// Auth : deux voies acceptées.
//  1) MCP_TOKEN statique (Mac / CI / curl).
//  2) Access token OAuth (connecteur Claude sur mobile/desktop).
const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;
  if (verifyMcpBearer(bearerToken)) {
    return { token: bearerToken, clientId: "static", scopes: ["mcp"], extra: {} };
  }
  const sub = verifyAccessToken(bearerToken);
  if (sub) {
    return { token: bearerToken, clientId: "oauth", scopes: ["mcp"], extra: { sub } };
  }
  return undefined;
};

const authed = experimental_withMcpAuth(handler, verifyToken, {
  required: true,
  // Fait pointer le 401 vers les métadonnées de ressource protégée (déclenche
  // la découverte OAuth côté client Claude).
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
  // Origine seule : withMcpAuth concatène le path, on veut donc la racine
  // (https://.../.well-known/...) et non https://.../mcp/.well-known/...
  resourceUrl: publicUrl(),
});

export { authed as GET, authed as POST, authed as DELETE };
