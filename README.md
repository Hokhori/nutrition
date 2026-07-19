# Nutrition — suivi calorique & macros (`nutrition.hokhori.be`)

App perso de suivi calorique + macros (glucides, sucres, lipides, saturés,
protéines, fibres, sel), objectif de perte de poids → cap calorique journalier,
avec un **serveur MCP** pour que Claude enregistre les apports et gère la base
d'aliments (OpenFoodFacts + recherche web).

Stack : **Next.js 16** (App Router) · **Postgres** · **Drizzle** · **pnpm/Node 22**.
Hébergée sur le VPS Hokhori selon le standard maison (runner self-hosted + `ci-cd.yml`).

## Développement local

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d      # Postgres local

cp .env.example .env
# Génère les secrets :
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
echo "MCP_TOKEN=$(openssl rand -hex 32)" >> .env
node scripts/hash-password.mjs "monMotDePasse"       # -> colle dans WEB_PASSWORD_HASH

pnpm db:generate     # génère les migrations SQL dans ./drizzle (à committer)
pnpm db:migrate      # applique les migrations
pnpm dev             # http://localhost:3000
```

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion Postgres |
| `SESSION_SECRET` | Secret iron-session (≥ 32 chars) |
| `WEB_PASSWORD_HASH` | Hash du mot de passe web (`scrypt$salt$hash`) |
| `MCP_TOKEN` | Token Bearer exigé sur `/mcp` et `/api` |
| `APP_TZ` | Fuseau du « jour » nutritionnel (défaut `Europe/Brussels`) |

## Serveur MCP

Endpoint distant : `https://nutrition.hokhori.be/mcp` (StreamableHTTP, Bearer).

Brancher Claude Code :

```bash
claude mcp add --transport http nutrition https://nutrition.hokhori.be/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

Outils : `search_foods`, `lookup_openfoodfacts`, `create_food`, `update_food`,
`log_food`, `list_entries`, `delete_entry`, `get_daily_summary`, `set_goal`,
`log_weight`, `get_progress`.

## Déploiement (VPS Hokhori)

Le déploiement est automatique via `.github/workflows/ci-cd.yml` :
push sur `main` → job `quality` (GitHub-hosted) → job `deploy` (runner self-hosted
`nutrition` sur le VPS) qui rsync le code vers `~/repos/nutrition` puis
`docker compose up -d --build` dans `~/stacks/nutrition`.

Provisioning initial (une fois) :

1. `sudo hokhori-add-client nutrition nutrition.hokhori.be`
2. Adapter `~/stacks/nutrition/docker-compose.yml` (service `app` avec
   `build.context: /home/administrator/repos/nutrition`) et remplir `.env`.
3. Enregistrer le runner self-hosted dédié (`~/actions-runner-nutrition`).
4. DNS : `A nutrition.hokhori.be → 178.105.188.14`.
5. Premier push sur `main`.

Les migrations Drizzle s'appliquent au démarrage du container (entrypoint).
