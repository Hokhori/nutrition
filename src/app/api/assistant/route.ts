import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUserId, unauthorized } from "@/lib/api-guard";
import { buildTools } from "@/lib/assistant-tools";
import { getDailySummary, getSettings, latestWeight } from "@/lib/services";
import { todayISO } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bon compromis qualité/coût pour l'usage d'outils et l'estimation des macros.
const MODEL = "claude-sonnet-5";
const MAX_HISTORY = 12; // borne l'historique renvoyé au modèle (tokens)

type ChatMsg = { role: "user" | "assistant"; content: string };

const r = (n: number | null | undefined) => (n == null ? "?" : Math.round(n));
const DIR_FR = { loss: "perte de poids", gain: "prise de poids", maintain: "maintien" } as const;

/**
 * Contexte du compte injecté à chaque appel (données centralisées en base) :
 * évite un historique de conversation — l'assistant connaît l'état courant.
 */
async function buildUserContext(userId: number): Promise<string> {
  const [sum, settings, lw] = await Promise.all([
    getDailySummary(userId),
    getSettings(userId),
    latestWeight(userId),
  ]);
  const t = sum.target;
  const cap = sum.effectiveTargetKcal ?? t.target;
  const goal = t.manual
    ? `cap manuel ${r(cap)} kcal/j`
    : `${DIR_FR[t.direction]} — poids ${r(lw?.weightKg)} kg → cible ${r(settings.targetWeightKg)} kg (${settings.weeklyRateKg} kg/sem), cap ${r(cap)} kcal/j`;
  return [
    `Date du jour : ${todayISO()}.`,
    `Profil/objectif : ${goal}.`,
    `Aujourd'hui : ${r(sum.totals.kcal)} kcal consommées, ${sum.remainingKcal == null ? "?" : r(sum.remainingKcal)} restantes` +
      ` · protéines ${r(sum.totals.proteinG)}${sum.macros.proteinG ? "/" + r(sum.macros.proteinG) : ""} g` +
      ` · sucres ajoutés ${r(sum.totals.addedSugarsG)} g · sel ${r(sum.totals.saltG)} g` +
      `${sum.activityKcal > 0 ? ` · sport +${r(sum.activityKcal)} kcal` : ""}.`,
  ].join("\n");
}

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

  const system = `Tu es l'assistant nutrition de l'utilisateur connecté.
Tu peux, via les outils, enregistrer repas/poids/sport, définir l'objectif et consulter le bilan du jour.
Le contexte du compte (objectif, bilan du jour, poids) t'est fourni à chaque message : appuie-toi dessus, ne redemande pas ce que tu sais déjà.
Règles :
- Aliment : d'abord search_foods. Absent → lookup_openfoodfacts ; sans résultat fiable → estime les macros toi-même puis create_food. Ensuite log_food avec foodId.
- Code-barres scanné absent d'OpenFoodFacts : propose de le contribuer. N'appelle contribute_openfoodfacts QUE si l'utilisateur fournit les vraies valeurs de l'étiquette (jamais tes estimations : base publique partagée).
- quantityG = grammes RÉELLEMENT mangés, JAMAIS la valeur calorique. Pour 100 g d'un aliment, quantityG=100. Portions réalistes (salade de pâtes ≈ 200-350 g, part de pizza ≈ 120-200 g, œuf ≈ 55 g).
- Plat composé (salade, plat cuisiné…) : choisis UNE seule méthode — soit le plat entier en une entrée (quantité totale), soit chaque ingrédient séparément — JAMAIS les deux (sinon double comptage). Par défaut, une seule entrée pour le plat entier.
- Cohérence avant d'enregistrer : kcal/100g ≤ ~900 ; kcal ≈ 4×protéines + 4×glucides + 9×lipides (±15 %). Si l'écart est grand, recorrige les valeurs.
- Réponds en français, bref et concret. Confirme ce que tu as fait (kcal ajoutées, kcal restantes du jour).
- Ne fais que ce qui est demandé ; n'invente pas de repas non mentionnés.`;

  const context = await buildUserContext(userId);
  const client = new Anthropic();

  try {
    const finalMessage = await client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 1024,
      // Bloc statique mis en cache (instructions + outils) ; contexte compte
      // dynamique dans un 2e bloc non caché (change chaque jour / message).
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Contexte du compte :\n${context}` },
      ],
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
