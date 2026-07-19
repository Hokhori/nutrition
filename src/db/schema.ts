import {
  pgTable,
  serial,
  integer,
  text,
  real,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Profils d'aliments. Toutes les valeurs nutritionnelles sont exprimées
 * **pour 100 g / 100 ml** (standard étiquette UE).
 */
export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  barcode: text("barcode").unique(),
  // Macros pour 100 g/ml
  kcal: real("kcal").notNull(),
  proteinG: real("protein_g").notNull().default(0),
  carbsG: real("carbs_g").notNull().default(0),
  sugarsG: real("sugars_g").notNull().default(0),
  fatG: real("fat_g").notNull().default(0),
  saturatedG: real("saturated_g").notNull().default(0),
  fiberG: real("fiber_g").notNull().default(0),
  saltG: real("salt_g").notNull().default(0),
  // Taille d'une portion "standard" en grammes (optionnel, pour l'UI)
  servingSizeG: real("serving_size_g"),
  source: text("source"), // 'openfoodfacts' | 'web' | 'manual'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Journal des apports. Les macros d'une ligne sont **calculées à la lecture**
 * (quantityG / 100 × valeurs du food), pas stockées.
 */
export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  consumedOn: date("consumed_on").notNull(), // jour nutritionnel (YYYY-MM-DD)
  foodId: integer("food_id").references(() => foods.id, { onDelete: "set null" }),
  label: text("label"), // libellé libre / snapshot du nom d'aliment
  quantityG: real("quantity_g").notNull(),
  meal: text("meal"), // 'petit-dej' | 'dej' | 'diner' | 'snack' | null
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Réglages du profil (ligne unique, id = 1). Le poids courant vit dans
 * `weight_log` (source unique) — pas ici.
 */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  sex: text("sex"), // 'm' | 'f'
  birthYear: integer("birth_year"),
  heightCm: real("height_cm"),
  activityLevel: text("activity_level").notNull().default("sedentary"),
  targetWeightKg: real("target_weight_kg"),
  weeklyRateKg: real("weekly_rate_kg").notNull().default(0.5),
  manualKcalTarget: real("manual_kcal_target"),
  proteinTargetG: real("protein_target_g"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Historique de poids : une pesée par jour (upsert sur `logged_on`).
 */
export const weightLog = pgTable("weight_log", {
  id: serial("id").primaryKey(),
  loggedOn: date("logged_on").notNull().unique(),
  weightKg: real("weight_kg").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type WeightEntry = typeof weightLog.$inferSelect;
