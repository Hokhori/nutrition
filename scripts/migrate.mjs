// Applique les migrations Drizzle (dossier ./drizzle) au démarrage du container.
// Utilise le migrator officiel (tracking via table __drizzle_migrations).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { randomBytes } from "node:crypto";

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

// Seed idempotent : crée le compte admin depuis l'env au premier lancement et
// rattache les données existantes (mono-user historique) à cet admin.
async function seed() {
  await sql`INSERT INTO app_config (id, require_approval) VALUES (1, false) ON CONFLICT (id) DO NOTHING`;

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM users`;
  let adminId;
  if (count === 0) {
    const email = process.env.ADMIN_EMAIL || "admin@nutrition.local";
    const pwHash = process.env.WEB_PASSWORD_HASH;
    if (!pwHash) {
      console.warn("[seed] WEB_PASSWORD_HASH absent : admin non créé (à créer via inscription).");
    } else {
      const token = randomBytes(32).toString("hex");
      const [row] = await sql`
        INSERT INTO users (email, password_hash, role, status, mcp_token)
        VALUES (${email}, ${pwHash}, 'admin', 'active', ${token})
        RETURNING id`;
      adminId = row.id;
      console.log(`[seed] compte admin créé : ${email}`);
    }
  } else {
    const [row] = await sql`SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`;
    adminId = row?.id;
  }

  // Rattache les lignes héritées (user_id NULL) à l'admin.
  if (adminId) {
    for (const table of ["entries", "settings", "weight_log", "activities"]) {
      await sql`UPDATE ${sql(table)} SET user_id = ${adminId} WHERE user_id IS NULL`;
    }
    console.log(`[seed] données héritées rattachées à l'admin #${adminId}`);
  }
}

try {
  await run();
  await seed();
  console.log("[migrate] Seed OK.");
} catch (e) {
  console.error("[migrate] Échec:", e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
