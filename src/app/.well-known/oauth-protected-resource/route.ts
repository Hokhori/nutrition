import { generateProtectedResourceMetadata } from "mcp-handler";
import { issuer, resourceUrl } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// Métadonnées de la ressource protégée (RFC 9728) : pointe vers notre AS.
export async function GET() {
  const metadata = generateProtectedResourceMetadata({
    authServerUrls: [issuer()],
    resourceUrl: resourceUrl(),
  });
  return Response.json(metadata, { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
