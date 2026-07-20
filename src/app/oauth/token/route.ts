import {
  verifyClient,
  consumeAuthCode,
  verifyPkce,
  issueTokens,
  verifyRefreshToken,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function oauthError(error: string, description?: string, status = 400): Response {
  return Response.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: CORS },
  );
}

/** Récupère client_id/secret depuis le body ou l'en-tête Basic. */
function clientCreds(
  form: FormData,
  req: Request,
): { id: string | null; secret: string | null } {
  let id = (form.get("client_id") as string) || null;
  let secret = (form.get("client_secret") as string) || null;
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Basic\s+(.+)$/i);
  if (m) {
    try {
      const [bid, bsecret] = Buffer.from(m[1], "base64").toString("utf8").split(":");
      id = id || decodeURIComponent(bid);
      secret = secret || decodeURIComponent(bsecret);
    } catch {
      /* ignore */
    }
  }
  return { id, secret };
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return oauthError("invalid_request", "corps attendu en form-urlencoded");
  }

  const grantType = String(form.get("grant_type") ?? "");
  const { id, secret } = clientCreds(form, req);

  if (!verifyClient(id, secret)) {
    return oauthError("invalid_client", "identifiants client invalides", 401);
  }

  if (grantType === "authorization_code") {
    const code = String(form.get("code") ?? "");
    const redirectUri = String(form.get("redirect_uri") ?? "");
    const codeVerifier = String(form.get("code_verifier") ?? "");

    const entry = consumeAuthCode(code);
    if (!entry) return oauthError("invalid_grant", "code invalide ou expiré");
    if (entry.clientId !== id) return oauthError("invalid_grant", "client mismatch");
    if (entry.redirectUri !== redirectUri) return oauthError("invalid_grant", "redirect_uri mismatch");
    if (!codeVerifier || !verifyPkce(codeVerifier, entry.codeChallenge))
      return oauthError("invalid_grant", "PKCE invalide");

    return Response.json(issueTokens("logan"), { headers: CORS });
  }

  if (grantType === "refresh_token") {
    const refreshToken = String(form.get("refresh_token") ?? "");
    const sub = verifyRefreshToken(refreshToken);
    if (!sub) return oauthError("invalid_grant", "refresh_token invalide");
    return Response.json(issueTokens(sub), { headers: CORS });
  }

  return oauthError("unsupported_grant_type", `grant_type '${grantType}' non supporté`);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
