import { verifyWebPassword } from "@/lib/auth";
import {
  clientId,
  isAllowedRedirect,
  createAuthCode,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

type Params = {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
};

function readParams(sp: URLSearchParams | FormData): Params {
  const g = (k: string) => String(sp.get(k) ?? "");
  return {
    response_type: g("response_type"),
    client_id: g("client_id"),
    redirect_uri: g("redirect_uri"),
    state: g("state"),
    code_challenge: g("code_challenge"),
    code_challenge_method: g("code_challenge_method"),
    scope: g("scope"),
  };
}

/** Valide les paramètres. Renvoie un message d'erreur, ou null si OK. */
function validate(p: Params): string | null {
  if (p.response_type !== "code") return "response_type doit être 'code'";
  if (!p.client_id || p.client_id !== clientId()) return "client_id invalide";
  if (!p.redirect_uri || !isAllowedRedirect(p.redirect_uri))
    return "redirect_uri non autorisée";
  if (!p.code_challenge || p.code_challenge_method !== "S256")
    return "PKCE S256 requis (code_challenge)";
  return null;
}

function errorPage(message: string, status = 400): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <body style="font-family:system-ui;background:#0a0e13;color:#e6edf3;display:grid;place-items:center;min-height:100vh;margin:0">
     <div style="max-width:22rem;padding:1.5rem;text-align:center">
       <div style="font-size:1.5rem;margin-bottom:.5rem">🥗 Nutrition</div>
       <p style="color:#f87171">${esc(message)}</p>
     </div></body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function loginForm(p: Params, error?: string): Response {
  const hidden = (
    ["response_type", "client_id", "redirect_uri", "state", "code_challenge", "code_challenge_method", "scope"] as const
  )
    .map((k) => `<input type="hidden" name="${k}" value="${esc(p[k])}">`)
    .join("");
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Nutrition — Autoriser Claude</title>
     <body style="font-family:system-ui;background:#0a0e13;color:#e6edf3;display:grid;place-items:center;min-height:100vh;margin:0">
     <form method="POST" action="/oauth/authorize" style="width:100%;max-width:22rem;background:#131a22;border:1px solid #263040;border-radius:1rem;padding:1.5rem">
       <div style="text-align:center;margin-bottom:1rem">
         <div style="font-size:1.5rem">🥗 Nutrition</div>
         <p style="color:#8b98a9;font-size:.9rem;margin:.25rem 0 0">Autoriser <b>Claude</b> à accéder à ton suivi</p>
       </div>
       ${hidden}
       <input type="password" name="password" placeholder="Mot de passe" autofocus autocomplete="current-password" required
         style="width:100%;box-sizing:border-box;background:#1b232d;border:1px solid #263040;border-radius:.6rem;padding:.6rem .75rem;color:#e6edf3;outline:none">
       ${error ? `<p style="color:#f87171;font-size:.85rem;margin:.5rem 0 0">${esc(error)}</p>` : ""}
       <button type="submit"
         style="width:100%;margin-top:.75rem;background:#34d399;color:#05231a;border:0;border-radius:.6rem;padding:.6rem;font-weight:600;cursor:pointer">
         Autoriser
       </button>
     </form></body>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: Request) {
  const p = readParams(new URL(req.url).searchParams);
  const err = validate(p);
  if (err) return errorPage(err);
  return loginForm(p);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const p = readParams(form);
  const err = validate(p);
  if (err) return errorPage(err);

  const password = String(form.get("password") ?? "");
  if (!verifyWebPassword(password)) {
    return loginForm(p, "Mot de passe incorrect.");
  }

  const code = createAuthCode({
    codeChallenge: p.code_challenge,
    redirectUri: p.redirect_uri,
    clientId: p.client_id,
  });

  const to = new URL(p.redirect_uri);
  to.searchParams.set("code", code);
  if (p.state) to.searchParams.set("state", p.state);
  return Response.redirect(to.toString(), 302);
}
