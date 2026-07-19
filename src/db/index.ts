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
  if (process.env.NODE_ENV !== "production") {
    globalForDb._pg = client;
    globalForDb._db = instance;
  }
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
