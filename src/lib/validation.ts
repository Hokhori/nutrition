import { z } from "zod";

export const MEALS = ["petit-dej", "dej", "diner", "snack"] as const;
export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;

const nonNeg = z.number().min(0);

export const per100Schema = z.object({
  kcal: nonNeg,
  proteinG: nonNeg.default(0),
  carbsG: nonNeg.default(0),
  sugarsG: nonNeg.default(0),
  fatG: nonNeg.default(0),
  saturatedG: nonNeg.default(0),
  fiberG: nonNeg.default(0),
  saltG: nonNeg.default(0),
});
export type Per100Input = z.infer<typeof per100Schema>;

export const createFoodSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(120).nullish(),
  barcode: z.string().max(32).nullish(),
  per_100g: per100Schema,
  servingSizeG: z.number().positive().nullish(),
  source: z.string().max(40).nullish(),
});
export type CreateFoodInput = z.infer<typeof createFoodSchema>;

export const updateFoodSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  brand: z.string().max(120).nullish(),
  barcode: z.string().max(32).nullish(),
  kcal: nonNeg.optional(),
  proteinG: nonNeg.optional(),
  carbsG: nonNeg.optional(),
  sugarsG: nonNeg.optional(),
  fatG: nonNeg.optional(),
  saturatedG: nonNeg.optional(),
  fiberG: nonNeg.optional(),
  saltG: nonNeg.optional(),
  servingSizeG: z.number().positive().nullish(),
  source: z.string().max(40).nullish(),
});
export type UpdateFoodInput = z.infer<typeof updateFoodSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format YYYY-MM-DD");

export const logFoodSchema = z
  .object({
    foodId: z.number().int().positive().optional(),
    label: z.string().min(1).max(200).optional(),
    quantityG: z.number().positive(),
    date: isoDate.optional(),
    meal: z.enum(MEALS).nullish(),
  })
  .refine((v) => v.foodId !== undefined || (v.label !== undefined && v.label.length > 0), {
    message: "Fournir foodId (aliment existant) ou label (saisie libre).",
  });
export type LogFoodInput = z.infer<typeof logFoodSchema>;

export const setGoalSchema = z.object({
  sex: z.enum(["m", "f"]).nullish(),
  birthYear: z.number().int().min(1900).max(2100).nullish(),
  heightCm: z.number().positive().max(260).nullish(),
  activityLevel: z.enum(ACTIVITY_LEVELS).optional(),
  targetWeightKg: z.number().positive().max(500).nullish(),
  weeklyRateKg: z.number().min(0).max(2).optional(),
  manualKcalTarget: z.number().positive().max(10000).nullish(),
  proteinTargetG: z.number().positive().max(500).nullish(),
});
export type SetGoalInput = z.infer<typeof setGoalSchema>;

export const logWeightSchema = z.object({
  weightKg: z.number().positive().max(500),
  date: isoDate.optional(),
});
export type LogWeightInput = z.infer<typeof logWeightSchema>;

export const searchFoodsSchema = z.object({
  query: z.string().min(1).max(120),
  limit: z.number().int().min(1).max(50).optional(),
});

export const offLookupSchema = z.object({
  query: z.string().min(1).max(120),
  limit: z.number().int().min(1).max(10).optional(),
});
