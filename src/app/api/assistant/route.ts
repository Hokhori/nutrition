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
- Code-barres scanné absent d'OpenFoodFacts : propose de le contribuer. N'appelle contribute_openfoodfacts QUE si l'utilisateur fournit les vraies valeurs de l'étiquette (jamais tes estimations : base publique partagée).
- quantityG = grammes RÉELLEMENT mangés, JAMAIS la valeur calorique. Pour 100 g d'un aliment, quantityG=100. Portions réalistes (salade de pâtes ≈ 200-350 g, part de pizza ≈ 120-200 g, œuf ≈ 55 g).
- Plat composé (salade, plat cuisiné…) : choisis UNE seule méthode — soit le plat entier en une entrée (quantité totale), soit chaque ingrédient séparément — JAMAIS les deux (sinon double comptage). Par défaut, une seule entrée pour le plat entier.
- Cohérence avant d'enregistrer : kcal/100g ≤ ~900 ; kcal ≈ 4×protéines + 4×glucides + 9×lipides (±15 %). Si l'écart est grand, recorrige les valeurs.
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
