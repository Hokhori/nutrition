// Applique les migrations Drizzle (dossier ./drizzle) au démarrage du container.
// Utilise le migrator officiel (tracking via table __drizzle_migrations).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL manquant");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

// Petit retry : au boot, le container `db` peut ne pas être prêt tout de suite.
async function run() {
  const attempts = 10;
  for (let i = 1; i <= attempts; i++) {
    try {
      await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
      console.log("[migrate] Migrations appliquées.");
      return;
    } catch (e) {
      if (i === attempts) throw e;
      console.warn(`[migrate] tentative ${i}/${attempts} échouée, retry dans 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

try {
  await run();
} catch (e) {
  console.error("[migrate] Échec:", e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
