import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

// Client réutilisé entre les hot-reloads en dev.
const globalForDb = globalThis as unknown as {
  _pg?: ReturnType<typeof postgres>;
  _db?: DB;
};

/**
 * Construction paresseuse : la connexion n'est créée qu'au premier accès réel
 * (runtime), pas à l'import. Ça permet à `next build` d'importer les modules
 * sans DATABASE_URL ni tentative de connexion.
 */
function real(): DB {
  if (globalForDb._db) return globalForDb._db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant");
  }
  const client =
    globalForDb._pg ??
    postgres(connectionString, {
      max: 5,
      prepare: false,
    });
  const instance = drizzle(client, { schema });
  // Toujours mettre en cache le singleton : un seul pool de connexions par
  // process (en dev le cache sur globalThis survit aussi au hot-reload).
  // NE PAS conditionner à NODE_ENV, sinon la prod recrée un client (et un pool)
  // à chaque accès → "too many clients already".
  globalForDb._pg = client;
  globalForDb._db = instance;
  return instance;
}

// Proxy : diffère l'initialisation tout en gardant l'API `db.select(...)`.
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const r = real();
    const value = Reflect.get(r as object, prop, r);
    return typeof value === "function" ? value.bind(r) : value;
  },
}) as DB;

export { schema };
