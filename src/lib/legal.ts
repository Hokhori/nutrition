import "server-only";

/**
 * Identité de l'exploitant (responsable de traitement) et paramètres légaux.
 *
 * Ce dépôt est open-source : les mentions légales sont renseignées via des
 * variables d'environnement pour que chaque hébergeur y mette SA propre identité.
 * Les valeurs absentes s'affichent comme « [à compléter] » afin que l'oubli soit
 * visible avant une mise en production.
 */

/**
 * Version des documents légaux (CGU / confidentialité / consentement santé).
 * À incrémenter (nouvelle date) à chaque modification substantielle : le
 * consentement recueilli est horodaté avec cette version (RGPD art. 7).
 */
export const LEGAL_VERSION = "2026-07-21";

/** Âge minimum pour créer un compte (âge du consentement numérique en Belgique). */
export const MIN_AGE = 13;

const TODO = "[à compléter]";

function env(key: string, fallback = TODO): string {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
}

export type Operator = {
  name: string;
  address: string;
  email: string;
  legalId: string; // n° d'entreprise (BCE/KBO) ou équivalent
  vat: string;
  jurisdiction: string;
  dpo: string | null; // contact DPO/RGPD si distinct de `email`
  hosting: string;
  publicUrl: string;
  siteName: string;
};

/** Résout l'identité de l'exploitant depuis l'environnement. */
export function getOperator(): Operator {
  const publicUrl = env("PUBLIC_URL", "").replace(/\/$/, "");
  return {
    name: env("OPERATOR_NAME"),
    address: env("OPERATOR_ADDRESS"),
    email: env("OPERATOR_EMAIL"),
    legalId: env("OPERATOR_LEGAL_ID"),
    vat: env("OPERATOR_VAT", ""),
    jurisdiction: env("OPERATOR_JURISDICTION", "Belgique"),
    dpo: process.env.DPO_EMAIL?.trim() || null,
    hosting: env("HOSTING_PROVIDER", "Hetzner Online GmbH — Allemagne (Union européenne)"),
    publicUrl: publicUrl || "http://localhost:3000",
    siteName: env("SITE_NAME", "Nutrition"),
  };
}

/** L'assistant IA (API Anthropic) est-il actif sur cette instance ? */
export function assistantEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** L'intégration OpenFoodFacts en écriture (contribution) est-elle configurée ? */
export function offContributionEnabled(): boolean {
  return Boolean(process.env.OFF_USER?.trim());
}
