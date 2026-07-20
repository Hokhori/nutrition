/**
 * Intégration OpenFoodFacts (API publique gratuite).
 * Renvoie des candidats normalisés "pour 100 g", prêts pour `createFood`.
 * Doc : https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

import type { Per100 } from "./nutrition";

const UA = "nutrition-hokhori/1.0 (logan.hendryckx@hokhori.be)";
const FIELDS =
  "code,product_name,product_name_fr,brands,serving_quantity,nutriments";

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
};

function num(v: number | string | undefined): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
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
    addedSugarsG: num(n["added-sugars_100g"]),
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
