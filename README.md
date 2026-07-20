# Nutrition — suivi calorique & macros, auto-hébergeable

Application web de suivi calorique et de macronutriments (glucides, sucres — dont
sucres ajoutés —, lipides, saturés, protéines, fibres, sel), avec objectif de
perte/prise de poids traduit en **cap calorique journalier**, suivi du poids,
activité physique, et une base d'aliments partagée alimentée par **OpenFoodFacts**.

Deux façons d'enregistrer ses apports par le langage naturel :

- **Serveur MCP** intégré : branchez Claude (Claude Code, ou l'app mobile/desktop
  via connecteur OAuth) et dictez vos repas, votre poids, votre sport.
- **Assistant IA in-app** (facultatif) : un chat dans le site qui fait les mêmes
  actions via l'API Claude, sans configuration côté client.

Multi-utilisateurs, inscription libre avec validation admin optionnelle.

> Projet **open-source (AGPL-3.0)** — hébergez votre propre instance. Ce dépôt est
> aussi celui de l'instance de référence ; le job de déploiement du VPS est
> automatiquement ignoré sur les forks (voir plus bas).

**Stack :** Next.js 16 (App Router) · React 19 · TypeScript · Postgres 16 ·
Drizzle ORM · Tailwind v4 · pnpm / Node 22.

---

## Démarrage rapide (auto-hébergement, Docker)

Prérequis : Docker + Docker Compose.

```bash
git clone https://github.com/Hokhori/nutrition.git
cd nutrition
cp .env.example .env

# 1) Générez les secrets (SESSION_SECRET, MCP_TOKEN, OAuth…) + le hash admin :
node scripts/generate-secrets.mjs "monMotDePasseAdmin"
#   → copiez les lignes affichées dans votre .env
# 2) Renseignez au minimum ADMIN_EMAIL dans .env (et PUBLIC_URL en prod).

docker compose up -d --build
```

L'app écoute sur `http://localhost:3000`. Connectez-vous avec `ADMIN_EMAIL` et le
mot de passe choisi. Les migrations de base s'appliquent automatiquement au
démarrage du conteneur.

> Pas de Node en local ? Générez les secrets avec `openssl` (voir la table
> ci-dessous), et le hash du mot de passe via
> `docker compose run --rm app node scripts/hash-password.mjs "monMotDePasse"`.

### HTTPS / mise en production

Mettez un reverse proxy TLS devant l'app (le HTTPS est **requis** pour le
connecteur MCP OAuth de Claude et recommandé partout). Définissez `PUBLIC_URL`
sur votre domaine public. Exemple minimal avec **Caddy** :

```
nutrition.exemple.org {
    reverse_proxy localhost:3000
}
```

Caddy gère alors automatiquement le certificat Let's Encrypt.

---

## Développement local

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d          # Postgres local uniquement

cp .env.example .env
node scripts/generate-secrets.mjs "monMotDePasse" >> .env   # secrets + hash
# Vérifiez DATABASE_URL (dev local) et ADMIN_EMAIL dans .env

pnpm db:migrate          # applique les migrations
pnpm dev                 # http://localhost:3000
```

Scripts utiles : `pnpm typecheck`, `pnpm lint`, `pnpm build`,
`pnpm db:generate` (génère de nouvelles migrations SQL après modif du schéma —
à committer).

---

## Variables d'environnement

| Variable | Requis | Rôle |
|---|---|---|
| `ADMIN_EMAIL` | ✅ | Email du compte admin créé au premier démarrage |
| `WEB_PASSWORD_HASH` | ✅ | Hash du mot de passe admin initial (`scripts/hash-password.mjs`) |
| `SESSION_SECRET` | ✅ | Secret iron-session (≥ 32 chars) — `openssl rand -base64 32` |
| `DATABASE_URL` | ✅* | Connexion Postgres (*auto-construit par `docker-compose.yml`) |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | compose | Identifiants Postgres du `docker-compose.yml` |
| `APP_PORT` | ⬜ | Port exposé sur l'hôte (défaut `3000`) |
| `PUBLIC_URL` | prod | URL publique (issuer OAuth + ressource MCP), ex `https://…` |
| `MCP_TOKEN` | ⬜ | Token Bearer admin partagé pour `/mcp` et `/api` — `openssl rand -hex 32` |
| `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` | ⬜ | Client OAuth pour le connecteur Claude mobile/desktop |
| `OAUTH_JWT_SECRET` | ⬜ | Signature des tokens OAuth (repli sur `SESSION_SECRET`) |
| `ANTHROPIC_API_KEY` | ⬜ | Active l'assistant IA in-app (facturé sur votre compte Anthropic) |
| `APP_TZ` | ⬜ | Fuseau du « jour » nutritionnel (défaut `Europe/Brussels`) |
| `OFF_USER_AGENT` | ⬜ | User-Agent envoyé à OpenFoodFacts (identifiez votre instance) |

Le plus simple : `node scripts/generate-secrets.mjs "<mot-de-passe>"` génère tous
les secrets aléatoires + le hash d'un coup.

---

## Serveur MCP

Endpoint : `<PUBLIC_URL>/mcp` (transport StreamableHTTP, authentification Bearer).
Chaque utilisateur dispose d'un **token personnel** régénérable (page Profil →
« Configurer MCP »), qui scope les actions à ses propres données.

**Claude Code :**

```bash
claude mcp add --transport http nutrition <PUBLIC_URL>/mcp \
  --header "Authorization: Bearer <votre-token-perso>"
```

**App Claude (mobile/desktop) :** connecteur OAuth — voir le tutoriel intégré dans
la page Profil (nécessite `OAUTH_CLIENT_ID/SECRET` + HTTPS).

Outils exposés : `search_foods`, `lookup_openfoodfacts`, `create_food`,
`update_food`, `log_food`, `list_entries`, `delete_entry`, `get_daily_summary`,
`set_goal`, `log_weight`, `log_activity`, `get_progress`.

## Assistant IA in-app

Si `ANTHROPIC_API_KEY` est défini, l'onglet **Assistant** (icône ✨) ouvre un chat
qui effectue les mêmes actions que le MCP via l'API Claude, côté serveur. Optimisé
pour le coût : modèle **Claude Haiku 4.5**, prompt système mis en cache, historique
borné. Sans clé, l'onglet renvoie une erreur explicite ; le reste de l'app
fonctionne normalement.

---

## Multi-utilisateurs

- Inscription libre par email + mot de passe.
- Un admin peut activer « validation requise » : les nouveaux comptes restent en
  attente jusqu'à approbation (dashboard **Admin**).
- **Données privées par utilisateur** (journaux, objectifs, poids, activités) ;
  **catalogue d'aliments partagé** entre tous (comme OpenFoodFacts).

---

## Déploiement de l'instance de référence

Le workflow `.github/workflows/ci-cd.yml` contient un job `deploy` **spécifique à
l'instance officielle** (`github.repository == 'Hokhori/nutrition'`, runner
self-hosted). Sur un fork, ce job est ignoré : seul le job `quality` (typecheck +
lint + build) s'exécute. Pour votre propre déploiement, utilisez le
`docker-compose.yml` ci-dessus, ou votre propre pipeline.

---

## Contribuer

Les contributions sont bienvenues — voir [CONTRIBUTING.md](CONTRIBUTING.md).
Pour signaler une faille de sécurité, voir [SECURITY.md](SECURITY.md).

## Licence

[GNU AGPL-3.0](LICENSE). Toute instance accessible sur un réseau doit rendre son
code source (y compris vos modifications) disponible à ses utilisateurs.
