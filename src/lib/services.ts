import "server-only";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { foods, entries, settings, weightLog, activities, users, appConfig } from "@/db/schema";
import type { Food, Activity, User } from "@/db/schema";
import { hashPassword, generateMcpToken, type Role } from "./auth";
import {
  type Nutrients,
  type Per100,
  type ActivityLevel,
  ZERO_NUTRIENTS,
  scaleNutrients,
  addNutrients,
  roundNutrients,
  computeCalorieTarget,
  macroTargets,
  estimateGoalDate,
  bmrMifflinStJeor,
  type CalorieTarget,
  type MacroTargets,
} from "./nutrition";
import { resolveDate, todayISO, addDaysISO, daysBetweenISO } from "./date";
import { activityKcal } from "./activities";
import type {
  CreateFoodInput,
  UpdateFoodInput,
  LogFoodInput,
  SetGoalInput,
  LogWeightInput,
  LogActivityInput,
} from "./validation";

// --- Utilisateurs & config ------------------------------------------------

export type PublicUser = {
  id: number;
  email: string;
  role: Role;
  status: "active" | "pending";
  createdAt: string;
};

function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    role: u.role as Role,
    status: u.status as "active" | "pending",
    createdAt: u.createdAt.toISOString(),
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: number): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByMcpToken(token: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.mcpToken, token)).limit(1);
  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  role?: Role;
  status?: "active" | "pending";
}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      passwordHash: hashPassword(input.password),
      role: input.role ?? "user",
      status: input.status ?? "active",
      mcpToken: generateMcpToken(),
    })
    .returning();
  // Crée d'emblée la ligne settings de l'utilisateur.
  await db.insert(settings).values({ userId: row.id }).onConflictDoNothing();
  return row;
}

export async function listUsers(): Promise<PublicUser[]> {
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));
  return rows.map(toPublicUser);
}

export async function setUserStatus(id: number, status: "active" | "pending"): Promise<void> {
  await db.update(users).set({ status }).where(eq(users.id, id));
}

export async function setUserRole(id: number, role: Role): Promise<void> {
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function deleteUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

export async function regenerateMcpToken(id: number): Promise<string> {
  const token = generateMcpToken();
  await db.update(users).set({ mcpToken: token }).where(eq(users.id, id));
  return token;
}

export async function countAdmins(): Promise<number> {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  return rows.length;
}

export async function getFirstAdminId(): Promise<number | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.id))
    .limit(1);
  return row?.id ?? null;
}

export async function getAppConfig(): Promise<{ requireApproval: boolean }> {
  await db.insert(appConfig).values({ id: 1 }).onConflictDoNothing();
  const [row] = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  return { requireApproval: row?.requireApproval ?? false };
}

export async function setRequireApproval(value: boolean): Promise<void> {
  await getAppConfig();
  await db.update(appConfig).set({ requireApproval: value }).where(eq(appConfig.id, 1));
}

// --- Aliments -------------------------------------------------------------

function foodPer100(f: Food): Per100 {
  return {
    kcal: f.kcal,
    proteinG: f.proteinG,
    carbsG: f.carbsG,
    sugarsG: f.sugarsG,
    addedSugarsG: f.addedSugarsG,
    fatG: f.fatG,
    saturatedG: f.saturatedG,
    fiberG: f.fiberG,
    saltG: f.saltG,
  };
}

export async function searchFoods(query: string, limit = 10): Promise<Food[]> {
  const like = `%${query}%`;
  return db
    .select()
    .from(foods)
    .where(or(ilike(foods.name, like), ilike(foods.brand, like)))
    .orderBy(asc(foods.name))
    .limit(limit);
}

export async function getFood(id: number): Promise<Food | null> {
  const rows = await db.select().from(foods).where(eq(foods.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getFoodByBarcode(barcode: string): Promise<Food | null> {
  const rows = await db.select().from(foods).where(eq(foods.barcode, barcode)).limit(1);
  return rows[0] ?? null;
}

export async function createFood(input: CreateFoodInput, createdBy?: number | null): Promise<Food> {
  const p = input.per_100g;
  const [row] = await db
    .insert(foods)
    .values({
      name: input.name,
      brand: input.brand ?? null,
      barcode: input.barcode ?? null,
      kcal: p.kcal,
      proteinG: p.proteinG,
      carbsG: p.carbsG,
      sugarsG: p.sugarsG,
      addedSugarsG: p.addedSugarsG,
      fatG: p.fatG,
      saturatedG: p.saturatedG,
      fiberG: p.fiberG,
      saltG: p.saltG,
      servingSizeG: input.servingSizeG ?? null,
      source: input.source ?? "manual",
      createdBy: createdBy ?? null,
    })
    .returning();
  return row;
}

export async function updateFood(id: number, patch: UpdateFoodInput): Promise<Food | null> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  const map: Record<keyof UpdateFoodInput, string> = {
    name: "name",
    brand: "brand",
    barcode: "barcode",
    kcal: "kcal",
    proteinG: "proteinG",
    carbsG: "carbsG",
    sugarsG: "sugarsG",
    addedSugarsG: "addedSugarsG",
    fatG: "fatG",
    saturatedG: "saturatedG",
    fiberG: "fiberG",
    saltG: "saltG",
    servingSizeG: "servingSizeG",
    source: "source",
  };
  for (const key of Object.keys(patch) as (keyof UpdateFoodInput)[]) {
    if (patch[key] !== undefined) set[map[key]] = patch[key];
  }
  const [row] = await db.update(foods).set(set).where(eq(foods.id, id)).returning();
  return row ?? null;
}

export async function listFoods(limit = 200): Promise<Food[]> {
  return db.select().from(foods).orderBy(desc(foods.updatedAt)).limit(limit);
}

// --- Apports (entries) ----------------------------------------------------

export type EntryView = {
  id: number;
  foodId: number | null;
  name: string;
  brand: string | null;
  quantityG: number;
  meal: string | null;
  nutrients: Nutrients;
  createdAt: string;
};

function entryNutrients(quantityG: number, food: Food | null): Nutrients {
  if (!food) return { ...ZERO_NUTRIENTS };
  return scaleNutrients(foodPer100(food), quantityG);
}

export async function listEntries(userId: number, dateInput?: string | null): Promise<EntryView[]> {
  const date = resolveDate(dateInput);
  const rows = await db
    .select({ entry: entries, food: foods })
    .from(entries)
    .leftJoin(foods, eq(entries.foodId, foods.id))
    .where(and(eq(entries.userId, userId), eq(entries.consumedOn, date)))
    .orderBy(asc(entries.createdAt));

  return rows.map(({ entry, food }) => ({
    id: entry.id,
    foodId: entry.foodId,
    name: food?.name ?? entry.label ?? "Aliment inconnu",
    brand: food?.brand ?? null,
    quantityG: entry.quantityG,
    meal: entry.meal,
    nutrients: roundNutrients(entryNutrients(entry.quantityG, food)),
    createdAt: entry.createdAt.toISOString(),
  }));
}

export async function addEntry(userId: number, input: LogFoodInput): Promise<EntryView> {
  const date = resolveDate(input.date);
  let food: Food | null = null;
  if (input.foodId !== undefined) {
    food = await getFood(input.foodId);
    if (!food) {
      throw new ServiceError(`Aliment #${input.foodId} introuvable.`, "food_not_found");
    }
  }
  const [row] = await db
    .insert(entries)
    .values({
      userId,
      consumedOn: date,
      foodId: food?.id ?? null,
      label: food ? null : (input.label ?? null),
      quantityG: input.quantityG,
      meal: input.meal ?? null,
    })
    .returning();

  return {
    id: row.id,
    foodId: row.foodId,
    name: food?.name ?? row.label ?? "Aliment inconnu",
    brand: food?.brand ?? null,
    quantityG: row.quantityG,
    meal: row.meal,
    nutrients: roundNutrients(entryNutrients(row.quantityG, food)),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function deleteEntry(userId: number, id: number): Promise<boolean> {
  const rows = await db
    .delete(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, userId)))
    .returning({ id: entries.id });
  return rows.length > 0;
}

// --- Réglages / objectif --------------------------------------------------

export async function getSettings(userId: number) {
  await db.insert(settings).values({ userId }).onConflictDoNothing();
  const [row] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  return row;
}

export async function updateSettings(userId: number, patch: SetGoalInput) {
  await getSettings(userId); // garantit l'existence de la ligne
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of Object.keys(patch) as (keyof SetGoalInput)[]) {
    if (patch[key] !== undefined) set[key] = patch[key];
  }
  const [row] = await db.update(settings).set(set).where(eq(settings.userId, userId)).returning();
  return row;
}

// --- Poids ----------------------------------------------------------------

export async function logWeight(userId: number, input: LogWeightInput) {
  const date = resolveDate(input.date);
  const [row] = await db
    .insert(weightLog)
    .values({ userId, loggedOn: date, weightKg: input.weightKg })
    .onConflictDoUpdate({
      target: [weightLog.userId, weightLog.loggedOn],
      set: { weightKg: input.weightKg },
    })
    .returning();
  return row;
}

export async function latestWeight(
  userId: number,
): Promise<{ loggedOn: string; weightKg: number } | null> {
  const [row] = await db
    .select({ loggedOn: weightLog.loggedOn, weightKg: weightLog.weightKg })
    .from(weightLog)
    .where(eq(weightLog.userId, userId))
    .orderBy(desc(weightLog.loggedOn))
    .limit(1);
  return row ?? null;
}

export async function weightSeries(userId: number, limit = 180) {
  const rows = await db
    .select({ loggedOn: weightLog.loggedOn, weightKg: weightLog.weightKg })
    .from(weightLog)
    .where(eq(weightLog.userId, userId))
    .orderBy(asc(weightLog.loggedOn))
    .limit(limit);
  return rows;
}

// --- Activité physique ----------------------------------------------------

export async function addActivity(userId: number, input: LogActivityInput): Promise<Activity> {
  const date = resolveDate(input.date);
  let kcal = input.kcal;
  let met = input.met ?? null;
  if (kcal === undefined) {
    // Calcul via MET + durée + dernier poids connu.
    const lw = await latestWeight(userId);
    if (!lw) {
      throw new ServiceError(
        "Aucun poids enregistré : fournis les kcal directement ou logue ton poids.",
        "no_weight",
      );
    }
    if (input.met === undefined || input.durationMin === undefined) {
      throw new ServiceError("Fournir kcal, ou met + durée.", "bad_input");
    }
    kcal = activityKcal(input.met, lw.weightKg, input.durationMin);
    met = input.met;
  }
  const [row] = await db
    .insert(activities)
    .values({
      userId,
      performedOn: date,
      name: input.name,
      durationMin: input.durationMin ?? null,
      kcal,
      met,
    })
    .returning();
  return row;
}

export async function listActivities(userId: number, dateInput?: string | null): Promise<Activity[]> {
  const date = resolveDate(dateInput);
  return db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, userId), eq(activities.performedOn, date)))
    .orderBy(asc(activities.createdAt));
}

export async function deleteActivity(userId: number, id: number): Promise<boolean> {
  const rows = await db
    .delete(activities)
    .where(and(eq(activities.id, id), eq(activities.userId, userId)))
    .returning({ id: activities.id });
  return rows.length > 0;
}

// --- Calcul du cap + cibles ----------------------------------------------

function currentAge(birthYear: number | null): number | null {
  if (!birthYear) return null;
  const y = parseInt(todayISO().slice(0, 4), 10);
  return y - birthYear;
}

export async function computeTargets(userId: number): Promise<{
  target: CalorieTarget;
  macros: MacroTargets;
  currentWeightKg: number | null;
  sedentaryKcal: number | null;
  minKcal: number | null;
}> {
  const s = await getSettings(userId);
  const lw = await latestWeight(userId);
  const weightKg = lw?.weightKg ?? null;
  const age = currentAge(s.birthYear);

  const baseInput = {
    sex: (s.sex as "m" | "f" | null) ?? null,
    age,
    heightCm: s.heightCm,
    weightKg,
    weeklyRateKg: s.weeklyRateKg,
    targetWeightKg: s.targetWeightKg,
    manualKcalTarget: s.manualKcalTarget,
  };

  // Plancher = métabolisme de base (BMR). En dessous durablement = effet inverse.
  const minKcal =
    s.sex && age && s.heightCm && weightKg
      ? Math.round(
          bmrMifflinStJeor({
            sex: s.sex as "m" | "f",
            age,
            heightCm: s.heightCm,
            weightKg,
          }),
        )
      : null;

  const target = computeCalorieTarget({
    ...baseInput,
    activityLevel: s.activityLevel as ActivityLevel,
  });

  // Cap pour une journée sédentaire (aucune activité) : facteur d'activité 1.2,
  // même déficit. Utile les jours où on ne bouge pas.
  const sedentary = computeCalorieTarget({ ...baseInput, activityLevel: "sedentary" });

  const macros = macroTargets({
    kcalTarget: target.target,
    weightKg,
    proteinTargetG: s.proteinTargetG,
  });

  return { target, macros, currentWeightKg: weightKg, sedentaryKcal: sedentary.target, minKcal };
}

// --- Résumé journalier ----------------------------------------------------

export type DailySummary = {
  date: string;
  entries: EntryView[];
  totals: Nutrients;
  target: CalorieTarget;
  macros: MacroTargets;
  remainingKcal: number | null;
  sedentaryKcal: number | null;
  activityKcal: number; // kcal brûlées via sport logué ce jour
  effectiveTargetKcal: number | null; // cap base + activité
  activities: Activity[];
  minKcal: number | null; // plancher (BMR) à ne pas franchir durablement
};

export async function getDailySummary(
  userId: number,
  dateInput?: string | null,
): Promise<DailySummary> {
  const date = resolveDate(dateInput);
  const [entryViews, targets, dayActivities] = await Promise.all([
    listEntries(userId, date),
    computeTargets(userId),
    listActivities(userId, date),
  ]);

  const totalsRaw = entryViews.reduce<Nutrients>(
    (acc, e) => addNutrients(acc, e.nutrients),
    { ...ZERO_NUTRIENTS },
  );
  const totals = roundNutrients(totalsRaw);

  const activityKcalTotal = Math.round(dayActivities.reduce((acc, a) => acc + a.kcal, 0));
  const baseTarget = targets.target.target;
  const effectiveTargetKcal = baseTarget !== null ? baseTarget + activityKcalTotal : null;
  const remainingKcal = effectiveTargetKcal !== null ? effectiveTargetKcal - totals.kcal : null;

  return {
    date,
    entries: entryViews,
    totals,
    target: targets.target,
    macros: targets.macros,
    remainingKcal,
    sedentaryKcal: targets.sedentaryKcal,
    activityKcal: activityKcalTotal,
    effectiveTargetKcal,
    activities: dayActivities,
    minKcal: targets.minKcal,
  };
}

/** Cadence de pesée recommandée (hebdomadaire). */
export const WEIGH_IN_INTERVAL_DAYS = 7;

export type Progress = {
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  weeklyRateKg: number;
  kgRemaining: number | null;
  weeksRemaining: number | null;
  etaISO: string | null;
  calorieTarget: CalorieTarget;
  series: { loggedOn: string; weightKg: number }[];
  lastWeighInISO: string | null;
  nextWeighInISO: string | null;
  daysUntilNextWeighIn: number | null;
};

export async function getProgress(userId: number): Promise<Progress> {
  const s = await getSettings(userId);
  const [lw, series, targets] = await Promise.all([
    latestWeight(userId),
    weightSeries(userId),
    computeTargets(userId),
  ]);
  const eta = estimateGoalDate({
    currentWeightKg: lw?.weightKg ?? null,
    targetWeightKg: s.targetWeightKg,
    weeklyRateKg: s.weeklyRateKg,
    fromISODate: todayISO(),
  });

  const lastWeighInISO = lw?.loggedOn ?? null;
  const nextWeighInISO = lastWeighInISO ? addDaysISO(lastWeighInISO, WEIGH_IN_INTERVAL_DAYS) : null;
  const daysUntilNextWeighIn = nextWeighInISO ? daysBetweenISO(todayISO(), nextWeighInISO) : null;

  return {
    currentWeightKg: lw?.weightKg ?? null,
    targetWeightKg: s.targetWeightKg,
    weeklyRateKg: s.weeklyRateKg,
    kgRemaining: eta.kgRemaining,
    weeksRemaining: eta.weeksRemaining,
    etaISO: eta.etaISO,
    calorieTarget: targets.target,
    series,
    lastWeighInISO,
    nextWeighInISO,
    daysUntilNextWeighIn,
  };
}

// --- Erreur métier typée --------------------------------------------------

export class ServiceError extends Error {
  code: string;
  constructor(message: string, code = "error") {
    super(message);
    this.code = code;
  }
}
