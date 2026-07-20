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
- Aliment : cherche d'abord avec search_foods en utilisant un TERME COURT/CLÉ (ex « panzerotto », pas la description complète). Si un résultat correspond au même produit, RÉUTILISE son foodId avec log_food — ne crée JAMAIS un doublon proche d'un aliment déjà en base. Seulement si rien ne correspond : lookup_openfoodfacts ; sans résultat fiable → estime puis create_food, puis log_food.
- Code-barres scanné absent d'OpenFoodFacts : propose de le contribuer. N'appelle contribute_openfoodfacts QUE si l'utilisateur fournit les vraies valeurs de l'étiquette (jamais tes estimations : base publique partagée).
- quantityG = grammes RÉELLEMENT mangés, JAMAIS la valeur calorique. Pour 100 g d'un aliment, quantityG=100. Portions réalistes (part de pizza ≈ 120-200 g, œuf ≈ 55 g, c. à soupe d'huile ≈ 12-15 g).
- Plat de restaurant / fait maison SANS valeurs fiables : décompose-le en ingrédients individuels et estime pour CHACUN une quantité en grammes réaliste selon le contexte du plat et une portion normale. Ex. salade de pâtes : ~100 g pâtes (poids sec), ~60 g mozzarella, ~40 g jambon, ~15 g olives, ~15 g anchois, ~12 g huile d'olive, ~80 g tomate, ~80 g concombre. Pour chaque ingrédient : search_foods → sinon lookup_openfoodfacts → sinon estime, crée l'aliment, puis log_food. NE crée PAS un aliment « composite » unique avec des macros globales devinées.
- Produit avec valeurs fiables (emballage, code-barres, OpenFoodFacts, aliment simple) : une seule entrée suffit. Ne compte JAMAIS deux fois (plat entier + ses ingrédients).
- Cohérence avant d'enregistrer : kcal/100g ≤ ~900 ; kcal ≈ 4×protéines + 4×glucides + 9×lipides (±15 %). Si l'écart est grand, recorrige les valeurs.
- Correction/suppression : pour retrouver l'id d'une entrée, utilise list_entries (ou get_daily_summary) puis delete_entry ; corrige un aliment mal renseigné avec update_food.
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
