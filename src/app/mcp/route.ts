import { createMcpHandler, experimental_withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { registerTools } from "@/lib/mcp-tools";
import { verifyMcpBearer } from "@/lib/auth";

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

// Auth Bearer : seul le porteur du MCP_TOKEN peut appeler les outils.
const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!verifyMcpBearer(bearerToken)) return undefined;
  return {
    token: bearerToken as string,
    clientId: "logan",
    scopes: [],
    extra: {},
  };
};

const authed = experimental_withMcpAuth(handler, verifyToken, { required: true });

export { authed as GET, authed as POST, authed as DELETE };
