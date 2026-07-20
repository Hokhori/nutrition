/**
 * Intégration OpenFoodFacts (API publique gratuite).
 * Renvoie des candidats normalisés "pour 100 g", prêts pour `createFood`.
 * Doc : https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

import type { Per100 } from "./nutrition";

// OpenFoodFacts demande un User-Agent identifiant l'app + un contact.
// Chaque instance peut le personnaliser via OFF_USER_AGENT.
const UA = process.env.OFF_USER_AGENT || "nutrition-tracker (self-hosted; https://github.com/Hokhori/nutrition)";
const FIELDS =
  "code,product_name,product_name_fr,brands,serving_quantity,nutriments,nova_group,categories_tags";

export type OffCandidate = {
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number | null;
  per100: Per100;
  source: "openfoodfacts";
};

type OffNutriments = Record<string, number | string | undefined>;
type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: OffNutriments;
  nova_group?: number | string;
  categories_tags?: string[];
};

function num(v: number | string | undefined): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Catégories dont le sucre est majoritairement NATUREL (fruit, lait…).
const NATURAL_SUGAR_RE = /\b(fruits|vegetables|legumes|milks|dairy-drinks|plain-yogurts|honeys)\b/i;
// Catégories dont le sucre est majoritairement AJOUTÉ (produits sucrés/transformés).
const ADDED_SUGAR_RE =
  /\b(sugared|sweetened|desserts|confectioneries|sodas|biscuits|pastries|cakes|waffles|gaufres|chocolates|candies|ice-creams|breakfast-cereals|sweet-spreads|sodas-|sugary)\b/i;

/**
 * OpenFoodFacts ne fournit presque jamais `added-sugars_100g`. Quand il est
 * absent, on estime la part de sucres AJOUTÉS à partir du groupe NOVA (niveau de
 * transformation) et des catégories : produit transformé/sucré → tout ajouté ;
 * fruit/légume/lait nature → tout naturel ; sinon on reste prudent (0).
 */
function estimateAddedSugars(p: OffProduct, n: OffNutriments, sugarsG: number): number {
  const raw = n["added-sugars_100g"];
  if (raw !== undefined && raw !== "") return num(raw); // valeur fournie → confiance
  if (sugarsG <= 0) return 0;

  const cats = (p.categories_tags ?? []).join(" ");
  if (NATURAL_SUGAR_RE.test(cats) && !ADDED_SUGAR_RE.test(cats)) return 0;
  if (ADDED_SUGAR_RE.test(cats)) return sugarsG;

  const nova = num(p.nova_group);
  if (nova >= 3) return sugarsG; // transformé / ultra-transformé → sucre ajouté
  if (nova === 1 || nova === 2) return 0; // brut / peu transformé → sucre naturel
  return 0; // NOVA & catégories inconnus → prudence
}

function normalize(p: OffProduct): OffCandidate | null {
  const n = p.nutriments ?? {};
  const name = (p.product_name_fr || p.product_name || "").trim();
  if (!name) return null;

  // Sel : `salt_100g` sinon dérivé du sodium (× 2.5).
  const salt =
    n["salt_100g"] !== undefined
      ? num(n["salt_100g"])
      : num(n["sodium_100g"]) * 2.5;

  // Énergie : préférer kcal, sinon convertir depuis kJ (÷ 4.184).
  const kcal =
    n["energy-kcal_100g"] !== undefined
      ? num(n["energy-kcal_100g"])
      : num(n["energy_100g"]) / 4.184;

  const per100: Per100 = {
    kcal: Math.round(kcal * 10) / 10,
    proteinG: num(n["proteins_100g"]),
    carbsG: num(n["carbohydrates_100g"]),
    sugarsG: num(n["sugars_100g"]),
    addedSugarsG: Math.min(
      num(n["sugars_100g"]),
      estimateAddedSugars(p, n, num(n["sugars_100g"])),
    ),
    fatG: num(n["fat_100g"]),
    saturatedG: num(n["saturated-fat_100g"]),
    fiberG: num(n["fiber_100g"]),
    saltG: Math.round(salt * 100) / 100,
  };

  const serving = num(p.serving_quantity);

  return {
    barcode: p.code ?? null,
    name,
    brand: p.brands ? p.brands.split(",")[0].trim() : null,
    servingSizeG: serving > 0 ? serving : null,
    per100,
    source: "openfoodfacts",
  };
}

async function offFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    // Pas de cache : données à jour, requêtes à la demande.
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`OpenFoodFacts HTTP ${res.status}`);
  return res.json();
}

/** Recherche un produit par code-barres. */
export async function lookupByBarcode(barcode: string): Promise<OffCandidate | null> {
  const clean = barcode.replace(/\D/g, "");
  if (!clean) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${FIELDS}`;
  const data = (await offFetch(url)) as { status?: number; product?: OffProduct };
  if (!data || data.status !== 1 || !data.product) return null;
  return normalize(data.product);
}

/** Recherche des produits par nom (renvoie jusqu'à `limit` candidats). */
export async function searchByName(query: string, limit = 5): Promise<OffCandidate[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(Math.min(limit, 20)),
    fields: FIELDS,
  });
  const url = `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`;
  const data = (await offFetch(url)) as { products?: OffProduct[] };
  const products = Array.isArray(data?.products) ? data.products : [];
  return products
    .map(normalize)
    .filter((c): c is OffCandidate => c !== null)
    .filter((c) => c.per100.kcal > 0)
    .slice(0, limit);
}

/** Lookup unifié : si `q` ressemble à un code-barres, tente le code d'abord. */
export async function lookup(q: string, limit = 5): Promise<OffCandidate[]> {
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 14 && /^\d+$/.test(q.trim())) {
    const byCode = await lookupByBarcode(digits);
    if (byCode) return [byCode];
  }
  return searchByName(q, limit);
}

// --- Écriture (contribution) ----------------------------------------------

export type ContributeInput = {
  barcode: string;
  name: string;
  brand?: string | null;
  quantity?: string | null; // ex : "500 g", "1 L"
  categories?: string | null; // ex : "Biscuits, Gaufres"
  per100: Per100;
};

export type ContributeResult = {
  ok: boolean;
  code: string;
  url: string;
  created: boolean; // vrai si le produit n'existait pas encore
  status?: string;
};

/**
 * Contribue / met à jour un produit sur OpenFoodFacts (API d'écriture v2).
 * Requiert un compte contributeur (`OFF_USER` / `OFF_PASSWORD`, côté serveur).
 * ⚠ Réservé aux produits RÉELS avec code-barres et données d'étiquette exactes —
 * ne jamais pousser des macros estimées (base publique partagée).
 * `OFF_WRITE_BASE` permet de cibler le staging (https://world.openfoodfacts.net).
 */
export async function contribute(input: ContributeInput): Promise<ContributeResult> {
  const user = process.env.OFF_USER;
  const password = process.env.OFF_PASSWORD;
  if (!user || !password) {
    throw new Error("Contribution OpenFoodFacts indisponible : OFF_USER / OFF_PASSWORD non configurés.");
  }
  const code = input.barcode.replace(/\D/g, "");
  if (code.length < 8) throw new Error("Code-barres invalide (8 à 14 chiffres attendus).");
  if (!input.name.trim()) throw new Error("Nom de produit requis.");

  const base = (process.env.OFF_WRITE_BASE || "https://world.openfoodfacts.org").replace(/\/$/, "");
  const existed = (await lookupByBarcode(code)) !== null;

  const p = input.per100;
  const body = new URLSearchParams();
  body.set("code", code);
  body.set("user_id", user);
  body.set("password", password);
  body.set("product_name", input.name.trim());
  if (input.brand) body.set("brands", input.brand);
  if (input.quantity) body.set("quantity", input.quantity);
  if (input.categories) body.set("categories", input.categories);
  body.set("nutrition_data_per", "100g");
  body.set("nutriment_energy-kcal", String(p.kcal));
  body.set("nutriment_energy-kcal_unit", "kcal");
  // On ne pousse PAS les sucres ajoutés (souvent estimés) — seulement l'étiquette.
  const grams: Record<string, number> = {
    proteins: p.proteinG,
    carbohydrates: p.carbsG,
    sugars: p.sugarsG,
    fat: p.fatG,
    "saturated-fat": p.saturatedG,
    fiber: p.fiberG,
    salt: p.saltG,
  };
  for (const [k, v] of Object.entries(grams)) {
    if (v > 0) body.set(`nutriment_${k}`, String(v));
  }

  const res = await fetch(`${base}/cgi/product_jqm2.pl`, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(12000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenFoodFacts (écriture) HTTP ${res.status}`);
  let status: string | undefined;
  try {
    const j = JSON.parse(text) as { status?: number; status_verbose?: string };
    status = j.status_verbose;
    if (j.status !== 1) throw new Error(`OpenFoodFacts a refusé l'enregistrement : ${status ?? "inconnu"}`);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("OpenFoodFacts a refusé")) throw e;
    // Réponse non-JSON (HTML) = généralement un échec d'authentification.
    throw new Error("Réponse inattendue d'OpenFoodFacts (vérifie OFF_USER / OFF_PASSWORD).");
  }

  return { ok: true, code, url: `${base}/product/${code}`, created: !existed, status };
}
