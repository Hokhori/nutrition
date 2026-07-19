/**
 * Calculs nutritionnels : totaux de macros, dépense énergétique (Mifflin-St Jeor),
 * cap calorique journalier, et cibles/limites de macros.
 */

export type Nutrients = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  sugarsG: number;
  fatG: number;
  saturatedG: number;
  fiberG: number;
  saltG: number;
};

export const ZERO_NUTRIENTS: Nutrients = {
  kcal: 0,
  proteinG: 0,
  carbsG: 0,
  sugarsG: 0,
  fatG: 0,
  saturatedG: 0,
  fiberG: 0,
  saltG: 0,
};

/** Valeurs "pour 100 g" d'un aliment. */
export type Per100 = Nutrients;

/** Macros d'une quantité donnée d'un aliment (quantité en grammes). */
export function scaleNutrients(per100: Per100, quantityG: number): Nutrients {
  const f = quantityG / 100;
  return {
    kcal: per100.kcal * f,
    proteinG: per100.proteinG * f,
    carbsG: per100.carbsG * f,
    sugarsG: per100.sugarsG * f,
    fatG: per100.fatG * f,
    saturatedG: per100.saturatedG * f,
    fiberG: per100.fiberG * f,
    saltG: per100.saltG * f,
  };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    sugarsG: a.sugarsG + b.sugarsG,
    fatG: a.fatG + b.fatG,
    saturatedG: a.saturatedG + b.saturatedG,
    fiberG: a.fiberG + b.fiberG,
    saltG: a.saltG + b.saltG,
  };
}

export function roundNutrients(n: Nutrients): Nutrients {
  const r = (x: number) => Math.round(x * 10) / 10;
  return {
    kcal: Math.round(n.kcal),
    proteinG: r(n.proteinG),
    carbsG: r(n.carbsG),
    sugarsG: r(n.sugarsG),
    fatG: r(n.fatG),
    saturatedG: r(n.saturatedG),
    fiberG: r(n.fiberG),
    saltG: r(n.saltG),
  };
}

// --- Dépense énergétique --------------------------------------------------

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // peu ou pas d'exercice
  light: 1.375, // 1-3 j/sem
  moderate: 1.55, // 3-5 j/sem
  active: 1.725, // 6-7 j/sem
  very_active: 1.9, // travail physique + sport
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sédentaire",
  light: "Léger (1-3 j/sem)",
  moderate: "Modéré (3-5 j/sem)",
  active: "Actif (6-7 j/sem)",
  very_active: "Très actif",
};

/** Métabolisme de base (kcal/jour) — équation de Mifflin-St Jeor. */
export function bmrMifflinStJeor(params: {
  sex: "m" | "f";
  age: number;
  heightCm: number;
  weightKg: number;
}): number {
  const { sex, age, heightCm, weightKg } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "m" ? base + 5 : base - 161;
}

/** ~7700 kcal par kg de masse grasse. */
export const KCAL_PER_KG = 7700;

/** Plancher de sécurité pour le cap calorique. */
export const MIN_KCAL_FLOOR = 1200;

export type CalorieTargetInput = {
  sex: "m" | "f" | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null; // dernière pesée connue
  activityLevel: ActivityLevel;
  weeklyRateKg: number; // kg/semaine visés (perte)
  manualKcalTarget: number | null;
};

export type CalorieTarget = {
  target: number | null; // cap journalier (kcal), null si données insuffisantes
  bmr: number | null;
  tdee: number | null;
  dailyDeficit: number | null;
  manual: boolean;
  missing: string[]; // champs manquants pour le calcul
};

export function computeCalorieTarget(input: CalorieTargetInput): CalorieTarget {
  if (input.manualKcalTarget && input.manualKcalTarget > 0) {
    return {
      target: Math.round(input.manualKcalTarget),
      bmr: null,
      tdee: null,
      dailyDeficit: null,
      manual: true,
      missing: [],
    };
  }

  const missing: string[] = [];
  if (!input.sex) missing.push("sexe");
  if (!input.age) missing.push("âge");
  if (!input.heightCm) missing.push("taille");
  if (!input.weightKg) missing.push("poids");

  if (missing.length > 0 || !input.sex || !input.age || !input.heightCm || !input.weightKg) {
    return { target: null, bmr: null, tdee: null, dailyDeficit: null, manual: false, missing };
  }

  const bmr = bmrMifflinStJeor({
    sex: input.sex,
    age: input.age,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
  });
  const tdee = bmr * ACTIVITY_FACTORS[input.activityLevel];
  const dailyDeficit = (Math.max(0, input.weeklyRateKg) * KCAL_PER_KG) / 7;
  const target = Math.max(MIN_KCAL_FLOOR, Math.round(tdee - dailyDeficit));

  return {
    target,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyDeficit: Math.round(dailyDeficit),
    manual: false,
    missing: [],
  };
}

// --- Cibles / limites de macros ------------------------------------------

export type MacroTargets = {
  kcal: number | null;
  proteinG: number | null; // cible minimale
  carbsG: number | null; // indicatif
  fatG: number | null; // indicatif
  sugarsMaxG: number | null; // limite (OMS ~10% énergie)
  saturatedMaxG: number | null; // limite (~10% énergie)
  fiberMinG: number; // >= 30 g/j
  saltMaxG: number; // <= 6 g/j
};

/**
 * Dérive des cibles de macros à partir du cap calorique et du poids.
 * Réparti : protéines (1.8 g/kg par défaut), lipides 30% énergie, reste en glucides.
 */
export function macroTargets(params: {
  kcalTarget: number | null;
  weightKg: number | null;
  proteinTargetG: number | null;
}): MacroTargets {
  const { kcalTarget, weightKg, proteinTargetG } = params;

  const fiberMinG = 30;
  const saltMaxG = 6;

  if (!kcalTarget) {
    return {
      kcal: null,
      proteinG: proteinTargetG ?? (weightKg ? Math.round(1.8 * weightKg) : null),
      carbsG: null,
      fatG: null,
      sugarsMaxG: null,
      saturatedMaxG: null,
      fiberMinG,
      saltMaxG,
    };
  }

  const proteinG = proteinTargetG ?? (weightKg ? Math.round(1.8 * weightKg) : Math.round((kcalTarget * 0.3) / 4));
  const fatG = Math.round((kcalTarget * 0.3) / 9);
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsG = Math.max(0, Math.round((kcalTarget - proteinKcal - fatKcal) / 4));
  const sugarsMaxG = Math.round((kcalTarget * 0.1) / 4);
  const saturatedMaxG = Math.round((kcalTarget * 0.1) / 9);

  return {
    kcal: kcalTarget,
    proteinG,
    carbsG,
    fatG,
    sugarsMaxG,
    saturatedMaxG,
    fiberMinG,
    saltMaxG,
  };
}

/** Estimation de la date d'atteinte de l'objectif de poids. */
export function estimateGoalDate(params: {
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  weeklyRateKg: number;
  fromISODate: string; // 'YYYY-MM-DD'
}): { weeksRemaining: number | null; etaISO: string | null; kgRemaining: number | null } {
  const { currentWeightKg, targetWeightKg, weeklyRateKg, fromISODate } = params;
  if (!currentWeightKg || !targetWeightKg || weeklyRateKg <= 0) {
    return { weeksRemaining: null, etaISO: null, kgRemaining: null };
  }
  const kgRemaining = currentWeightKg - targetWeightKg;
  if (kgRemaining <= 0) {
    return { weeksRemaining: 0, etaISO: fromISODate, kgRemaining: Math.round(kgRemaining * 10) / 10 };
  }
  const weeksRemaining = kgRemaining / weeklyRateKg;
  const from = new Date(fromISODate + "T00:00:00Z");
  const eta = new Date(from.getTime() + weeksRemaining * 7 * 24 * 3600 * 1000);
  return {
    weeksRemaining: Math.ceil(weeksRemaining),
    etaISO: eta.toISOString().slice(0, 10),
    kgRemaining: Math.round(kgRemaining * 10) / 10,
  };
}
