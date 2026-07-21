import {
  pgTable,
  serial,
  integer,
  text,
  real,
  date,
  timestamp,
  boolean,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Comptes utilisateurs. Login par email. `mcp_token` = token Bearer perso
 * (affiché dans le profil, régénérable) pour le serveur MCP.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // 'admin' | 'user'
  status: text("status").notNull().default("active"), // 'active' | 'pending'
  mcpToken: text("mcp_token").notNull().unique(),
  // Preuve de consentement RGPD (art. 7.1) recueilli à l'inscription : horodatage
  // + version des documents acceptés (CGU / confidentialité / traitement santé).
  consentAt: timestamp("consent_at", { withTimezone: true }),
  consentVersion: text("consent_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Configuration globale de l'app (ligne unique, id = 1). */
export const appConfig = pgTable("app_config", {
  id: integer("id").primaryKey().default(1),
  requireApproval: boolean("require_approval").notNull().default(false),
});

/**
 * Profils d'aliments — **catalogue partagé** entre tous les utilisateurs.
 * Valeurs nutritionnelles **pour 100 g / 100 ml** (standard étiquette UE).
 */
export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  barcode: text("barcode").unique(),
  kcal: real("kcal").notNull(),
  proteinG: real("protein_g").notNull().default(0),
  carbsG: real("carbs_g").notNull().default(0),
  sugarsG: real("sugars_g").notNull().default(0),
  addedSugarsG: real("added_sugars_g").notNull().default(0),
  fatG: real("fat_g").notNull().default(0),
  saturatedG: real("saturated_g").notNull().default(0),
  fiberG: real("fiber_g").notNull().default(0),
  saltG: real("salt_g").notNull().default(0),
  servingSizeG: real("serving_size_g"),
  source: text("source"), // 'openfoodfacts' | 'web' | 'manual'
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Journal des apports (privé par utilisateur). Les macros d'une ligne sont
 * **calculées à la lecture** (quantityG / 100 × valeurs du food).
 */
export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  consumedOn: date("consumed_on").notNull(),
  foodId: integer("food_id").references(() => foods.id, { onDelete: "set null" }),
  label: text("label"),
  quantityG: real("quantity_g").notNull(),
  meal: text("meal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Réglages du profil — **une ligne par utilisateur** (clé `user_id`). */
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  sex: text("sex"),
  birthYear: integer("birth_year"),
  heightCm: real("height_cm"),
  activityLevel: text("activity_level").notNull().default("sedentary"),
  targetWeightKg: real("target_weight_kg"),
  weeklyRateKg: real("weekly_rate_kg").notNull().default(0.5),
  manualKcalTarget: real("manual_kcal_target"),
  proteinTargetG: real("protein_target_g"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Historique de poids (privé) : une pesée par jour et par user. */
export const weightLog = pgTable(
  "weight_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    loggedOn: date("logged_on").notNull(),
    weightKg: real("weight_kg").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("weight_log_user_day").on(t.userId, t.loggedOn)],
);

/**
 * Séances d'activité physique (privé). Les kcal brûlées d'un jour rehaussent
 * le cap calorique effectif de ce jour.
 */
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  performedOn: date("performed_on").notNull(),
  name: text("name").notNull(),
  durationMin: real("duration_min"),
  kcal: real("kcal").notNull(),
  met: real("met"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type WeightEntry = typeof weightLog.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type AppConfig = typeof appConfig.$inferSelect;
