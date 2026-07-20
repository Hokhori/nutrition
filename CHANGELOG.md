# Changelog

Toutes les évolutions notables de ce projet sont documentées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ;
versionnage [SemVer](https://semver.org/lang/fr/).

## [0.1.0] — 2026-07-20

Première version publique, auto-hébergeable.

### Fonctionnalités

- **Suivi nutritionnel** : calories et macros (glucides, sucres — dont sucres
  ajoutés vs naturels —, lipides, saturés, protéines, fibres, sel), avec le
  détail par aliment sur le tableau de bord du jour.
- **Objectif & cap calorique** : objectif de perte/prise de poids traduit en cap
  calorique journalier (BMR Mifflin-St Jeor, TDEE), avec plancher calorique de
  sécurité et zone conseillée.
- **Activité physique** : onglet dédié, modèle « base sédentaire + activité »
  (pas → kcal, activités sportives via MET) qui adapte le cap du jour.
- **Suivi du poids** : journal de pesées, courbe de progression, prochaine date
  de pesée.
- **Base d'aliments partagée** alimentée par **OpenFoodFacts** (recherche par
  nom / code-barres) et création manuelle.
- **Multi-utilisateurs** : inscription libre par email, validation admin
  optionnelle, dashboard admin. Données privées par utilisateur ; catalogue
  d'aliments commun.
- **Serveur MCP** intégré (`/mcp`, StreamableHTTP, Bearer) : enregistrer repas,
  poids et activités en langage naturel depuis Claude Code, ou l'app Claude
  mobile/desktop via connecteur **OAuth 2.1**. Token MCP personnel par
  utilisateur (page Profil → « Configurer MCP »).
- **Assistant IA in-app** (facultatif) : un chat dans le site qui effectue les
  mêmes actions que le MCP via l'API Claude (modèle Claude Haiku 4.5), activé par
  `ANTHROPIC_API_KEY`.

### Auto-hébergement

- `docker-compose.yml` autonome (app + Postgres) : déploiement en une commande.
- `scripts/generate-secrets.mjs` pour générer tous les secrets + le hash admin.
- Migrations appliquées automatiquement au démarrage du conteneur.
- Documentation : `README.md` (guide complet), `CONTRIBUTING.md`, `SECURITY.md`.

### Divers

- Licence **GNU AGPL-3.0**.
- Stack : Next.js 16 (App Router) · React 19 · TypeScript · Postgres 16 ·
  Drizzle ORM · Tailwind v4 · pnpm / Node 22.

[0.1.0]: https://github.com/Hokhori/nutrition/releases/tag/v0.1.0
