import { createMcpHandler, experimental_withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { registerTools } from "@/lib/mcp-tools";
import { publicUrl } from "@/lib/oauth";
import { resolveBearerUserId } from "@/lib/api-guard";

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

// Auth : token statique env (admin), mcp_token perso, ou access token OAuth.
// Le userId résolu est transporté dans authInfo.extra pour les outils.
const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;
  const userId = await resolveBearerUserId(bearerToken);
  if (!userId) return undefined;
  return { token: bearerToken, clientId: "nutrition", scopes: ["mcp"], extra: { userId } };
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
