/**
 * Paliers caloriques journaliers.
 *
 * Découpe la journée en 5 paliers autour de la dépense énergétique estimée
 * (TDEE + sport du jour), avec un plancher bas = métabolisme de base (BMR).
 *
 * La couleur d'un palier dépend du SENS de l'objectif : un déficit est
 * souhaitable en perte de poids, contre-productif en prise de masse. Seul le
 * palier sous le plancher métabolique est rouge quel que soit l'objectif.
 */

import { MIN_KCAL_FLOOR, type GoalDirection } from "./nutrition";

export type ZoneKey = "under_floor" | "deficit" | "neutral" | "surplus" | "over_surplus";

/** Sémantique visuelle : vert → jaune → orange → rouge. */
export type ZoneStatus = "good" | "caution" | "alert" | "danger";

export type CalorieZone = {
  key: ZoneKey;
  label: string;
  /** Borne basse incluse (kcal). */
  min: number;
  /** Borne haute exclue (kcal) ; null = palier ouvert vers le haut. */
  max: number | null;
  status: ZoneStatus;
  /** Phrase affichée quand c'est le palier courant. */
  hint: string;
};

export type CalorieZones = {
  zones: CalorieZone[]; // du plus bas au plus haut
  /** Plancher métabolique (BMR) ou plancher de sécurité si BMR inconnu. */
  floorKcal: number;
  /** Vrai si le plancher est le forfait de sécurité (profil incomplet). */
  floorIsEstimate: boolean;
  /** Dépense estimée du jour = TDEE + kcal sport. */
  maintenanceKcal: number;
  /** Cap visé du jour (objectif + sport), null si non défini. */
  targetKcal: number | null;
  /** Haut de l'échelle de la jauge (kcal). */
  scaleMaxKcal: number;
  consumedKcal: number;
  currentIndex: number;
  current: CalorieZone;
  direction: GoalDirection;
};

/** Demi-largeur du palier "neutre" : 5 % de la dépense, au moins 100 kcal. */
const NEUTRAL_BAND_RATIO = 0.05;
const NEUTRAL_BAND_MIN = 100;
/** Au-delà de +25 % de la dépense, on bascule en "surexcédent". */
const OVER_SURPLUS_RATIO = 1.25;

const STATUS: Record<GoalDirection, Record<ZoneKey, ZoneStatus>> = {
  loss: {
    under_floor: "danger",
    deficit: "good",
    neutral: "caution",
    surplus: "alert",
    over_surplus: "danger",
  },
  gain: {
    under_floor: "danger",
    deficit: "alert",
    neutral: "caution",
    surplus: "good",
    over_surplus: "alert",
  },
  maintain: {
    under_floor: "danger",
    deficit: "caution",
    neutral: "good",
    surplus: "caution",
    over_surplus: "alert",
  },
};

const LABELS: Record<ZoneKey, string> = {
  under_floor: "Surdéficit",
  deficit: "Déficit",
  neutral: "Neutre",
  surplus: "Excédent",
  over_surplus: "Surexcédent",
};

const HINTS: Record<GoalDirection, Record<ZoneKey, string>> = {
  loss: {
    under_floor:
      "Sous ton métabolisme de base. Tenu plusieurs jours, le corps ralentit sa dépense : fonte musculaire, fatigue, effet yoyo.",
    deficit: "Déficit maîtrisé : la zone qui fait perdre du poids sans casser le métabolisme.",
    neutral: "Autour de ta dépense : peu ou pas de perte de poids sur cette journée.",
    surplus: "Au-dessus de ta dépense : cette journée annule une partie du déficit des autres jours.",
    over_surplus: "Bien au-dessus de ta dépense : cette journée efface plusieurs jours de déficit.",
  },
  gain: {
    under_floor:
      "Sous ton métabolisme de base, alors que tu vises une prise de poids. À corriger dès aujourd'hui.",
    deficit: "Tu manges moins que ta dépense : tu perds du poids au lieu d'en prendre.",
    neutral: "Autour de ta dépense : peu ou pas de prise de poids sur cette journée.",
    surplus: "Surplus contrôlé : la zone qui fait prendre du poids progressivement.",
    over_surplus:
      "Surplus trop large : au-delà de ~25 % de ta dépense, la prise se fait surtout en masse grasse.",
  },
  maintain: {
    under_floor:
      "Sous ton métabolisme de base. Tenu plusieurs jours, le corps ralentit sa dépense : fonte musculaire, fatigue, effet yoyo.",
    deficit: "En dessous de ta dépense : tu vas perdre du poids plutôt que te maintenir.",
    neutral: "Pile sur ta dépense — c'est exactement ta zone de maintien.",
    surplus: "Au-dessus de ta dépense : prise de poids si ça se répète.",
    over_surplus: "Bien au-dessus de ta dépense : prise de poids nette si ça se répète.",
  },
};

export type CalorieZonesInput = {
  consumedKcal: number;
  /** Métabolisme de base (kcal/j), null si profil incomplet. */
  bmrKcal: number | null;
  /** Dépense totale estimée hors sport du jour (kcal/j), null si profil incomplet. */
  tdeeKcal: number | null;
  /** Cap visé du jour, sport inclus (kcal), null si objectif non défini. */
  targetKcal: number | null;
  /** kcal brûlées par les activités du jour. */
  activityKcal: number;
  direction: GoalDirection;
};

/**
 * Construit les paliers. Retourne null si aucune référence de dépense n'est
 * calculable (profil incomplet ET aucun objectif) : la jauge n'a alors aucun
 * sens et l'appelant ne l'affiche pas.
 */
export function computeCalorieZones(input: CalorieZonesInput): CalorieZones | null {
  const { consumedKcal, bmrKcal, tdeeKcal, targetKcal, activityKcal, direction } = input;

  // Référence = dépense du jour. À défaut de TDEE (cap manuel), on se rabat sur
  // le cap saisi : c'est la seule référence dont on dispose.
  const maintenance = tdeeKcal !== null ? Math.round(tdeeKcal + activityKcal) : targetKcal;
  if (!maintenance || maintenance <= 0) return null;

  const floorIsEstimate = bmrKcal === null;
  // Garde-fou : le plancher doit rester sous le palier neutre pour que les
  // bornes restent ordonnées (cas d'un cap manuel très bas).
  const floor = Math.min(bmrKcal ?? MIN_KCAL_FLOOR, Math.round(maintenance * 0.85));

  const band = Math.max(NEUTRAL_BAND_MIN, Math.round(maintenance * NEUTRAL_BAND_RATIO));
  const neutralLow = maintenance - band;
  const neutralHigh = maintenance + band;
  const overSurplus = Math.round(maintenance * OVER_SURPLUS_RATIO);

  const bounds: { key: ZoneKey; min: number; max: number | null }[] = [
    { key: "under_floor", min: 0, max: floor },
    { key: "deficit", min: floor, max: neutralLow },
    { key: "neutral", min: neutralLow, max: neutralHigh },
    { key: "surplus", min: neutralHigh, max: overSurplus },
    { key: "over_surplus", min: overSurplus, max: null },
  ];

  const zones: CalorieZone[] = bounds.map((b) => ({
    ...b,
    label: LABELS[b.key],
    status: STATUS[direction][b.key],
    hint: HINTS[direction][b.key],
  }));

  const consumed = Math.max(0, Math.round(consumedKcal));
  let currentIndex = zones.findIndex((z) => z.max !== null && consumed < z.max);
  if (currentIndex === -1) currentIndex = zones.length - 1;

  // Haut de l'échelle : un peu au-dessus du seuil de surexcédent, et toujours
  // au-dessus de ce qui a réellement été consommé.
  const scaleMaxKcal = Math.ceil(Math.max(overSurplus * 1.1, consumed * 1.02) / 50) * 50;

  return {
    zones,
    floorKcal: floor,
    floorIsEstimate,
    maintenanceKcal: maintenance,
    targetKcal,
    scaleMaxKcal,
    consumedKcal: consumed,
    currentIndex,
    current: zones[currentIndex],
    direction,
  };
}

/**
 * Part de la piste réservée au palier bas (0 → plancher métabolique).
 *
 * Sur une échelle purement linéaire ce palier occupe ~45 % de la jauge et
 * écrase les paliers utiles (le "neutre" tombe à ~7 %). On lui alloue donc une
 * part fixe : l'échelle reste linéaire *à l'intérieur* de chaque tronçon, et
 * les bornes en kcal restent affichées à côté de chaque palier.
 */
const BASE_TRACK_SHARE = 0.26;

/**
 * Position d'une valeur en kcal sur la piste, de 0 (bas) à 1 (haut).
 * Échelle linéaire par morceaux — cf. BASE_TRACK_SHARE.
 */
export function trackPosition(zones: CalorieZones, kcal: number): number {
  const { floorKcal, scaleMaxKcal } = zones;
  const v = Math.max(0, Math.min(kcal, scaleMaxKcal));
  if (floorKcal <= 0) return v / scaleMaxKcal;
  if (v <= floorKcal) return (v / floorKcal) * BASE_TRACK_SHARE;
  const span = Math.max(1, scaleMaxKcal - floorKcal);
  return BASE_TRACK_SHARE + ((v - floorKcal) / span) * (1 - BASE_TRACK_SHARE);
}
