import "server-only";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import * as svc from "./services";
import * as off from "./openfoodfacts";

const isoDate = { type: "string" as const, pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const nn = { type: "number" as const, minimum: 0 };

/**
 * Construit les outils de l'assistant, scopés à l'utilisateur connecté.
 * Réutilise la couche services (mêmes actions que le MCP). Descriptions
 * volontairement courtes pour limiter les tokens d'entrée.
 */
export function buildTools(userId: number) {
  return [
    betaTool({
      name: "search_foods",
      description: "Cherche un aliment dans la base (par nom/marque). À utiliser avant d'en créer un.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
      run: async ({ query }) => {
        const rows = await svc.searchFoods(query, 8);
        return JSON.stringify(
          rows.map((f) => ({ id: f.id, name: f.name, brand: f.brand, kcal100: f.kcal, serving: f.servingSizeG })),
        );
      },
    }),

    betaTool({
      name: "lookup_openfoodfacts",
      description: "Cherche les valeurs nutritionnelles sur OpenFoodFacts (nom ou code-barres). Candidats non enregistrés.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
      run: async ({ query }) => {
        const c = await off.lookup(query, 4);
        return JSON.stringify(c);
      },
    }),

    betaTool({
      name: "contribute_openfoodfacts",
      description:
        "Ajoute/met à jour un produit RÉEL sur OpenFoodFacts (base publique). Uniquement pour un produit emballé avec code-barres et valeurs LUES SUR L'ÉTIQUETTE — jamais d'estimations. À utiliser après un scan de code-barres absent d'OFF.",
      inputSchema: {
        type: "object",
        properties: {
          barcode: { type: "string", minLength: 8, description: "code-barres EAN (8 à 14 chiffres)" },
          name: { type: "string" },
          brand: { type: "string" },
          quantity: { type: "string", description: "quantité nette, ex '500 g'" },
          categories: { type: "string", description: "catégories OFF, ex 'Biscuits, Gaufres'" },
          kcal: nn,
          proteinG: nn,
          carbsG: nn,
          sugarsG: nn,
          fatG: nn,
          saturatedG: nn,
          fiberG: nn,
          saltG: nn,
        },
        required: ["barcode", "name", "kcal"],
        additionalProperties: false,
      },
      run: async (a) => {
        const r = await off.contribute({
          barcode: a.barcode,
          name: a.name,
          brand: a.brand ?? null,
          quantity: a.quantity ?? null,
          categories: a.categories ?? null,
          per100: {
            kcal: a.kcal,
            proteinG: a.proteinG ?? 0,
            carbsG: a.carbsG ?? 0,
            sugarsG: a.sugarsG ?? 0,
            addedSugarsG: 0,
            fatG: a.fatG ?? 0,
            saturatedG: a.saturatedG ?? 0,
            fiberG: a.fiberG ?? 0,
            saltG: a.saltG ?? 0,
          },
        });
        return JSON.stringify({ created: r.created, url: r.url });
      },
    }),

    betaTool({
      name: "create_food",
      description:
        "Crée un profil d'aliment (macros pour 100 g). Utilise OpenFoodFacts si dispo, sinon tes meilleures estimations. Mets 0 pour les macros inconnues. addedSugarsG : pour un produit transformé/sucré (gaufre, biscuit, soda, bonbon, pâtisserie, céréales, chocolat, glace, yaourt sucré…) les sucres sont quasi tous AJOUTÉS → mets ≈ sugarsG ; 0 seulement pour fruits entiers, légumes, lait/yaourt nature.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          brand: { type: "string" },
          kcal: nn,
          proteinG: nn,
          carbsG: nn,
          sugarsG: nn,
          addedSugarsG: { type: "number", minimum: 0, description: "dont sucres ajoutés (g/100g) ; ≈ sugarsG pour un produit sucré/transformé, 0 pour fruit/légume/laitage nature" },
          fatG: nn,
          saturatedG: nn,
          fiberG: nn,
          saltG: nn,
          servingSizeG: { type: "number", minimum: 0 },
        },
        required: ["name", "kcal"],
        additionalProperties: false,
      },
      run: async (a) => {
        const food = await svc.createFood(
          {
            name: a.name,
            brand: a.brand ?? null,
            per_100g: {
              kcal: a.kcal,
              proteinG: a.proteinG ?? 0,
              carbsG: a.carbsG ?? 0,
              sugarsG: a.sugarsG ?? 0,
              addedSugarsG: a.addedSugarsG ?? 0,
              fatG: a.fatG ?? 0,
              saturatedG: a.saturatedG ?? 0,
              fiberG: a.fiberG ?? 0,
              saltG: a.saltG ?? 0,
            },
            servingSizeG: a.servingSizeG ?? null,
            source: "assistant",
          },
          userId,
        );
        return JSON.stringify({ id: food.id, name: food.name });
      },
    }),

    betaTool({
      name: "log_food",
      description:
        "Enregistre un apport. foodId (aliment existant, RECOMMANDÉ) ou label. quantityG en grammes. meal: petit-dej|dej|diner|snack. date optionnelle.",
      inputSchema: {
        type: "object",
        properties: {
          foodId: { type: "integer", minimum: 1 },
          label: { type: "string" },
          quantityG: { type: "number", exclusiveMinimum: 0 },
          meal: { type: "string", enum: ["petit-dej", "dej", "diner", "snack"] },
          date: isoDate,
        },
        required: ["quantityG"],
        additionalProperties: false,
      },
      run: async (a) => {
        const e = await svc.addEntry(userId, {
          foodId: a.foodId,
          label: a.label,
          quantityG: a.quantityG,
          meal: (a.meal as "petit-dej" | "dej" | "diner" | "snack" | undefined) ?? null,
          date: a.date,
        });
        return JSON.stringify({ id: e.id, name: e.name, quantityG: e.quantityG, kcal: e.nutrients.kcal });
      },
    }),

    betaTool({
      name: "get_daily_summary",
      description: "Résumé du jour : totaux, cap calorique, macros, restant. date optionnelle (défaut aujourd'hui).",
      inputSchema: {
        type: "object",
        properties: { date: isoDate },
        additionalProperties: false,
      },
      run: async ({ date }) => JSON.stringify(await svc.getDailySummary(userId, date)),
    }),

    betaTool({
      name: "set_goal",
      description:
        "Définit profil/objectif : sex (m/f), birthYear, heightCm, activityLevel (sedentary|light|moderate|active|very_active), targetWeightKg, weeklyRateKg. Renvoie le cap.",
      inputSchema: {
        type: "object",
        properties: {
          sex: { type: "string", enum: ["m", "f"] },
          birthYear: { type: "integer" },
          heightCm: { type: "number" },
          activityLevel: { type: "string", enum: ["sedentary", "light", "moderate", "active", "very_active"] },
          targetWeightKg: { type: "number" },
          weeklyRateKg: { type: "number" },
        },
        additionalProperties: false,
      },
      run: async (a) => {
        await svc.updateSettings(userId, {
          sex: a.sex as "m" | "f" | undefined,
          birthYear: a.birthYear,
          heightCm: a.heightCm,
          activityLevel: a.activityLevel as
            | "sedentary" | "light" | "moderate" | "active" | "very_active" | undefined,
          targetWeightKg: a.targetWeightKg,
          weeklyRateKg: a.weeklyRateKg,
        });
        const t = await svc.computeTargets(userId);
        return JSON.stringify({ cap: t.target.target, plancher: t.minKcal, manque: t.target.missing });
      },
    }),

    betaTool({
      name: "log_weight",
      description: "Enregistre une pesée (kg). date optionnelle (défaut aujourd'hui).",
      inputSchema: {
        type: "object",
        properties: { weightKg: { type: "number", exclusiveMinimum: 0 }, date: isoDate },
        required: ["weightKg"],
        additionalProperties: false,
      },
      run: async ({ weightKg, date }) => {
        const r = await svc.logWeight(userId, { weightKg, date });
        return JSON.stringify({ weightKg: r.weightKg, date: r.loggedOn });
      },
    }),

    betaTool({
      name: "log_activity",
      description:
        "Enregistre du sport (rehausse le cap du jour). Fournir kcal, OU met + durationMin (calcul via poids). Ex MET: marche 3.5, course 9, vélo 7.5, muscu 5.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          durationMin: { type: "number", exclusiveMinimum: 0 },
          kcal: { type: "number", exclusiveMinimum: 0 },
          met: { type: "number", exclusiveMinimum: 0 },
          date: isoDate,
        },
        required: ["name"],
        additionalProperties: false,
      },
      run: async (a) => {
        const r = await svc.addActivity(userId, {
          name: a.name,
          durationMin: a.durationMin,
          kcal: a.kcal,
          met: a.met,
          date: a.date,
        });
        return JSON.stringify({ id: r.id, name: r.name, kcal: r.kcal });
      },
    }),

    betaTool({
      name: "update_food",
      description:
        "Corrige/complète un aliment existant (macros manquantes ou fausses). Passe seulement les champs à modifier (id requis).",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", minimum: 1 },
          name: { type: "string" },
          brand: { type: "string" },
          kcal: nn,
          proteinG: nn,
          carbsG: nn,
          sugarsG: nn,
          addedSugarsG: nn,
          fatG: nn,
          saturatedG: nn,
          fiberG: nn,
          saltG: nn,
          servingSizeG: { type: "number", minimum: 0 },
        },
        required: ["id"],
        additionalProperties: false,
      },
      run: async (a) => {
        const { id, ...patch } = a;
        const food = await svc.updateFood(id, patch);
        return JSON.stringify(food ? { id: food.id, name: food.name, kcal: food.kcal } : { error: `Aliment #${id} introuvable` });
      },
    }),

    betaTool({
      name: "list_entries",
      description: "Liste les apports d'un jour (défaut aujourd'hui) avec leur id (utile pour corriger/supprimer).",
      inputSchema: {
        type: "object",
        properties: { date: isoDate },
        additionalProperties: false,
      },
      run: async ({ date }) => JSON.stringify(await svc.listEntries(userId, date)),
    }),

    betaTool({
      name: "delete_entry",
      description: "Supprime un apport du journal par son id (récupère l'id via list_entries ou get_daily_summary).",
      inputSchema: {
        type: "object",
        properties: { id: { type: "integer", minimum: 1 } },
        required: ["id"],
        additionalProperties: false,
      },
      run: async ({ id }) => {
        const done = await svc.deleteEntry(userId, id);
        return JSON.stringify(done ? { deleted: id } : { error: `Apport #${id} introuvable` });
      },
    }),

    betaTool({
      name: "list_activities",
      description: "Liste les activités physiques d'un jour (défaut aujourd'hui) avec leur id.",
      inputSchema: {
        type: "object",
        properties: { date: isoDate },
        additionalProperties: false,
      },
      run: async ({ date }) => JSON.stringify(await svc.listActivities(userId, date)),
    }),

    betaTool({
      name: "delete_activity",
      description: "Supprime une activité physique par son id.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "integer", minimum: 1 } },
        required: ["id"],
        additionalProperties: false,
      },
      run: async ({ id }) => {
        const done = await svc.deleteActivity(userId, id);
        return JSON.stringify(done ? { deleted: id } : { error: `Activité #${id} introuvable` });
      },
    }),

    betaTool({
      name: "get_progress",
      description: "Progression vers l'objectif : poids actuel, cible, kg restants, semaines estimées, ETA, cap calorique.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run: async () => JSON.stringify(await svc.getProgress(userId)),
    }),
  ];
}
