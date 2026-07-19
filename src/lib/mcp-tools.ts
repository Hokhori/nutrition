import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as svc from "./services";
import * as off from "./openfoodfacts";
import { MEALS, ACTIVITY_LEVELS } from "./validation";

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function ok(data: unknown, summary?: string): ToolResult {
  const text = summary
    ? `${summary}\n\n${JSON.stringify(data, null, 2)}`
    : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text }],
    structuredContent: data && typeof data === "object" ? (data as Record<string, unknown>) : { value: data },
  };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: `Erreur : ${message}` }], isError: true };
}

async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(msg);
  }
}

// Raw shape des macros pour 100 g (réutilisé par create_food).
const per100Shape = {
  kcal: z.number().min(0).describe("kcal pour 100 g/ml"),
  proteinG: z.number().min(0).default(0).describe("protéines (g) pour 100 g"),
  carbsG: z.number().min(0).default(0).describe("glucides (g) pour 100 g"),
  sugarsG: z.number().min(0).default(0).describe("dont sucres (g) pour 100 g"),
  fatG: z.number().min(0).default(0).describe("lipides (g) pour 100 g"),
  saturatedG: z.number().min(0).default(0).describe("dont saturés (g) pour 100 g"),
  fiberG: z.number().min(0).default(0).describe("fibres (g) pour 100 g"),
  saltG: z.number().min(0).default(0).describe("sel (g) pour 100 g"),
};

export function registerTools(server: McpServer): void {
  // 1. Rechercher un aliment déjà en base
  server.tool(
    "search_foods",
    "Cherche un aliment dans la base locale (par nom ou marque). Renvoie les profils existants avec leurs macros pour 100 g. Utilise ceci EN PREMIER avant de créer un aliment.",
    { query: z.string().min(1), limit: z.number().int().min(1).max(50).optional() },
    async (args) =>
      guard(async () => {
        const rows = await svc.searchFoods(args.query, args.limit ?? 10);
        return ok(rows, `${rows.length} aliment(s) trouvé(s) pour "${args.query}".`);
      }),
  );

  // 2. Chercher les valeurs nutritionnelles sur OpenFoodFacts
  server.tool(
    "lookup_openfoodfacts",
    "Interroge OpenFoodFacts (base publique) par nom de produit ou code-barres. Renvoie des candidats normalisés (macros pour 100 g) NON enregistrés : à passer ensuite à create_food. À utiliser quand l'aliment n'existe pas encore en base locale.",
    { query: z.string().min(1), limit: z.number().int().min(1).max(10).optional() },
    async (args) =>
      guard(async () => {
        const candidates = await off.lookup(args.query, args.limit ?? 5);
        if (candidates.length === 0) {
          return ok(
            { candidates: [] },
            `Aucun résultat OpenFoodFacts pour "${args.query}". Fais une recherche web puis create_food manuellement.`,
          );
        }
        return ok({ candidates }, `${candidates.length} candidat(s) OpenFoodFacts.`);
      }),
  );

  // 3. Créer un profil d'aliment
  server.tool(
    "create_food",
    "Crée un profil d'aliment (macros pour 100 g). Utilise les valeurs de lookup_openfoodfacts si disponibles, sinon d'une recherche web fiable.",
    {
      name: z.string().min(1),
      brand: z.string().optional(),
      barcode: z.string().optional(),
      per_100g: z.object(per100Shape),
      servingSizeG: z.number().positive().optional().describe("poids d'une portion standard en g (optionnel)"),
      source: z.string().optional().describe("'openfoodfacts' | 'web' | 'manual'"),
    },
    async (args) =>
      guard(async () => {
        const food = await svc.createFood({
          name: args.name,
          brand: args.brand ?? null,
          barcode: args.barcode ?? null,
          per_100g: args.per_100g,
          servingSizeG: args.servingSizeG ?? null,
          source: args.source ?? "web",
        });
        return ok(food, `Aliment créé : ${food.name} (#${food.id}).`);
      }),
  );

  // 4. Mettre à jour un profil existant
  server.tool(
    "update_food",
    "Corrige ou complète un profil d'aliment existant (ex: macro manquante). Ne passer que les champs à modifier.",
    {
      id: z.number().int().positive(),
      name: z.string().min(1).optional(),
      brand: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      kcal: z.number().min(0).optional(),
      proteinG: z.number().min(0).optional(),
      carbsG: z.number().min(0).optional(),
      sugarsG: z.number().min(0).optional(),
      fatG: z.number().min(0).optional(),
      saturatedG: z.number().min(0).optional(),
      fiberG: z.number().min(0).optional(),
      saltG: z.number().min(0).optional(),
      servingSizeG: z.number().positive().nullable().optional(),
      source: z.string().optional(),
    },
    async (args) =>
      guard(async () => {
        const { id, ...patch } = args;
        const food = await svc.updateFood(id, patch);
        if (!food) return fail(`Aliment #${id} introuvable.`);
        return ok(food, `Aliment #${id} mis à jour.`);
      }),
  );

  // 5. Enregistrer un apport
  server.tool(
    "log_food",
    "Enregistre un apport dans le journal. Fournir foodId (aliment existant — RECOMMANDÉ, macros exactes) OU label (saisie libre sans macros). quantityG = quantité consommée en grammes. date optionnelle (YYYY-MM-DD, défaut aujourd'hui).",
    {
      foodId: z.number().int().positive().optional(),
      label: z.string().min(1).optional(),
      quantityG: z.number().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      meal: z.enum(MEALS).optional(),
    },
    async (args) =>
      guard(async () => {
        if (args.foodId === undefined && !args.label) {
          return fail("Fournir foodId (préféré) ou label. Cherche/crée l'aliment d'abord.");
        }
        const entry = await svc.addEntry({
          foodId: args.foodId,
          label: args.label,
          quantityG: args.quantityG,
          date: args.date,
          meal: args.meal ?? null,
        });
        return ok(entry, `Apport enregistré : ${entry.name} ${entry.quantityG} g (${entry.nutrients.kcal} kcal).`);
      }),
  );

  // 6. Lister les apports d'un jour
  server.tool(
    "list_entries",
    "Liste les apports d'un jour (défaut aujourd'hui). date au format YYYY-MM-DD.",
    { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() },
    async (args) =>
      guard(async () => {
        const rows = await svc.listEntries(args.date);
        return ok(rows, `${rows.length} apport(s).`);
      }),
  );

  // 7. Supprimer un apport
  server.tool(
    "delete_entry",
    "Supprime un apport du journal par son id.",
    { id: z.number().int().positive() },
    async (args) =>
      guard(async () => {
        const okDel = await svc.deleteEntry(args.id);
        return okDel ? ok({ deleted: true }, `Apport #${args.id} supprimé.`) : fail(`Apport #${args.id} introuvable.`);
      }),
  );

  // 8. Résumé journalier vs cap
  server.tool(
    "get_daily_summary",
    "Résumé nutritionnel d'un jour : totaux (kcal + macros), cap calorique, cibles de macros et kcal restantes. date optionnelle (défaut aujourd'hui).",
    { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() },
    async (args) =>
      guard(async () => {
        const s = await svc.getDailySummary(args.date);
        const cap = s.target.target !== null ? `${s.totals.kcal}/${s.target.target} kcal` : `${s.totals.kcal} kcal (cap non défini)`;
        return ok(s, `Résumé ${s.date} — ${cap}, ${s.remainingKcal !== null ? `${s.remainingKcal} restantes` : "objectif à définir"}.`);
      }),
  );

  // 9. Définir l'objectif / profil
  server.tool(
    "set_goal",
    "Définit le profil et l'objectif de perte de poids : sexe (m/f), année de naissance, taille (cm), niveau d'activité, poids cible (kg), rythme hebdo (kg/semaine, ex 0.5), ou un cap calorique manuel. Renvoie le cap calculé.",
    {
      sex: z.enum(["m", "f"]).optional(),
      birthYear: z.number().int().min(1900).max(2100).optional(),
      heightCm: z.number().positive().max(260).optional(),
      activityLevel: z.enum(ACTIVITY_LEVELS).optional(),
      targetWeightKg: z.number().positive().max(500).optional(),
      weeklyRateKg: z.number().min(0).max(2).optional(),
      manualKcalTarget: z.number().positive().max(10000).nullable().optional(),
      proteinTargetG: z.number().positive().max(500).nullable().optional(),
    },
    async (args) =>
      guard(async () => {
        await svc.updateSettings(args);
        const targets = await svc.computeTargets();
        const cap = targets.target.target;
        return ok(targets, cap !== null ? `Objectif mis à jour. Cap calorique : ${cap} kcal/j.` : `Objectif partiellement défini. Manque : ${targets.target.missing.join(", ")}.`);
      }),
  );

  // 10. Enregistrer une pesée
  server.tool(
    "log_weight",
    "Enregistre une pesée (kg) pour un jour (défaut aujourd'hui, upsert). Sert au calcul du cap et au suivi.",
    { weightKg: z.number().positive().max(500), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() },
    async (args) =>
      guard(async () => {
        const row = await svc.logWeight({ weightKg: args.weightKg, date: args.date });
        return ok(row, `Poids enregistré : ${row.weightKg} kg le ${row.loggedOn}.`);
      }),
  );

  // 11. Progression vers l'objectif
  server.tool(
    "get_progress",
    "Progression vers l'objectif : poids actuel, cible, kg restants, semaines estimées, ETA, cap calorique, et série de poids.",
    {},
    async () =>
      guard(async () => {
        const p = await svc.getProgress();
        const line =
          p.currentWeightKg !== null && p.targetWeightKg !== null
            ? `${p.currentWeightKg} kg → ${p.targetWeightKg} kg (${p.kgRemaining} kg, ~${p.weeksRemaining} sem, ETA ${p.etaISO ?? "?"}).`
            : "Objectif ou poids non défini.";
        return ok(p, line);
      }),
  );

  // 12. Logger une activité physique
  server.tool(
    "log_activity",
    "Enregistre une séance de sport (rehausse le cap calorique du jour). Fournir kcal brûlées directement, OU met + durationMin (calcul via le poids). date optionnelle (défaut aujourd'hui). Ex MET : marche 3.5, course 9, vélo 7.5, muscu 5, HIIT 8, natation 6.",
    {
      name: z.string().min(1),
      durationMin: z.number().positive().max(1440).optional(),
      kcal: z.number().positive().max(10000).optional(),
      met: z.number().positive().max(25).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    },
    async (args) =>
      guard(async () => {
        if (args.kcal === undefined && (args.met === undefined || args.durationMin === undefined)) {
          return fail("Fournir kcal, ou met + durationMin.");
        }
        const a = await svc.addActivity(args);
        return ok(a, `Activité enregistrée : ${a.name} — ${a.kcal} kcal brûlées.`);
      }),
  );

  // 13. Lister les activités d'un jour
  server.tool(
    "list_activities",
    "Liste les activités physiques d'un jour (défaut aujourd'hui).",
    { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() },
    async (args) =>
      guard(async () => {
        const rows = await svc.listActivities(args.date);
        const total = rows.reduce((s, a) => s + a.kcal, 0);
        return ok(rows, `${rows.length} activité(s), ${Math.round(total)} kcal brûlées.`);
      }),
  );

  // 14. Supprimer une activité
  server.tool(
    "delete_activity",
    "Supprime une activité physique par son id.",
    { id: z.number().int().positive() },
    async (args) =>
      guard(async () => {
        const okDel = await svc.deleteActivity(args.id);
        return okDel ? ok({ deleted: true }, `Activité #${args.id} supprimée.`) : fail(`Activité #${args.id} introuvable.`);
      }),
  );
}
