# Contribuer

Merci de votre intérêt ! Ce projet est sous licence **AGPL-3.0**.

## Mettre en place l'environnement

Voir la section « Développement local » du [README](README.md). En résumé :

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env
node scripts/generate-secrets.mjs "monMotDePasse" >> .env
pnpm db:migrate
pnpm dev
```

## Avant d'ouvrir une Pull Request

Assurez-vous que ces trois commandes passent au vert (c'est aussi ce que vérifie
la CI) :

```bash
pnpm typecheck
pnpm lint
pnpm build
```

- **Petits commits ciblés**, messages clairs (le préfixe conventionnel est
  apprécié : `feat:`, `fix:`, `docs:`, `refactor:`…).
- **Ne committez jamais** de `.env`, de secrets, ni de données personnelles.
- Modif du **schéma de base** ? Générez la migration avec `pnpm db:generate` et
  committez le SQL produit dans `drizzle/`.
- Gardez le **style existant** (mêmes conventions, commentaires en français,
  code typé).

## Proposer une fonctionnalité

Ouvrez d'abord une *issue* pour en discuter avant d'écrire beaucoup de code —
ça évite les allers-retours. Décrivez le besoin, pas seulement la solution.

## Structure du projet (repères)

- `src/app` — routes Next.js (App Router), pages et API.
- `src/lib/services.ts` — logique métier (scopée par utilisateur).
- `src/lib/mcp-tools.ts` / `src/lib/assistant-tools.ts` — outils MCP / assistant.
- `src/db/schema.ts` — schéma Drizzle ; migrations dans `drizzle/`.
- `scripts/` — migration, génération de secrets, hash de mot de passe.

Par défaut, en cas de doute, ouvrez une issue : on préfère discuter tôt.
