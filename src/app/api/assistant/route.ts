import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUserId, unauthorized } from "@/lib/api-guard";
import { buildTools } from "@/lib/assistant-tools";
import { todayISO } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Modèle le moins cher qui supporte le tool use (choix explicite : coût minimal).
const MODEL = "claude-haiku-4-5";
const MAX_HISTORY = 12; // borne l'historique renvoyé au modèle (tokens)

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const userId = await getCurrentUserId(req);
  if (!userId) return unauthorized();

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Assistant indisponible : ANTHROPIC_API_KEY non configurée." },
      { status: 503 },
    );
  }

  let body: { messages?: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const history = Array.isArray(body.messages) ? body.messages : [];
  const messages = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Dernier message utilisateur requis" }, { status: 400 });
  }

  const system = `Tu es l'assistant nutrition de l'utilisateur connecté. Date du jour : ${todayISO()}.
Tu peux, via les outils, enregistrer repas/poids/sport, définir l'objectif et consulter le bilan du jour.
Règles :
- Aliment : d'abord search_foods. Absent → lookup_openfoodfacts ; sans résultat fiable → estime les macros toi-même puis create_food. Ensuite log_food avec foodId.
- Utilise des quantités en grammes réalistes ; demande la quantité seulement si vraiment ambigu.
- Réponds en français, bref et concret. Confirme ce que tu as fait (kcal ajoutées, kcal restantes du jour).
- Ne fais que ce qui est demandé ; n'invente pas de repas non mentionnés.`;

  const client = new Anthropic();

  try {
    const finalMessage = await client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: buildTools(userId),
      messages,
      max_iterations: 8, // garde-fou boucle d'outils
    });

    const text = finalMessage.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return Response.json({
      reply: text || "(pas de réponse)",
      usage: {
        input: finalMessage.usage.input_tokens,
        output: finalMessage.usage.output_tokens,
        cacheRead: finalMessage.usage.cache_read_input_tokens ?? 0,
      },
    });
  } catch (e) {
    console.error("[assistant]", e);
    const msg = e instanceof Anthropic.APIError ? `Erreur API (${e.status})` : "Erreur assistant";
    return Response.json({ error: msg }, { status: 502 });
  }
}
