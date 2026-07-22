# Conformité légale — nutrition.hokhori.be

> ⚠️ Ces documents sont des **brouillons** préparés pour cadrer la mise en
> conformité. Ils ne constituent pas un avis juridique. Faites-les valider par un
> juriste / DPO avant un lancement public, l'application traitant des
> **données de santé** (catégorie particulière, art. 9 RGPD).

## Ce qui est couvert dans le code (fait)

- [x] **Pages légales publiques** : `/legal/mentions`, `/legal/confidentialite`, `/legal/cgu`
      (liens en pied de page, sur le login et l'inscription).
- [x] **Consentement explicite** à l'inscription : CGU + confidentialité,
      traitement des données de santé, âge ≥ 13 ans. Preuve horodatée en base
      (`users.consent_at`, `users.consent_version`).
- [x] **Droits RGPD self-service** dans `/profile` : export JSON (accès +
      portabilité) et suppression de compte (effacement + retrait du consentement).
- [x] **Disclaimer médical** (CGU + pied de page) et **transparence IA** sur
      l'assistant.
- [x] **Cookie** strictement nécessaire uniquement (pas de bannière requise).

## Ce qui reste à faire (hors code — administratif / juridique)

- [ ] **Renseigner l'identité de l'exploitant** dans `.env` du VPS :
      `OPERATOR_NAME`, `OPERATOR_ADDRESS`, `OPERATOR_EMAIL`, `OPERATOR_LEGAL_ID`,
      `OPERATOR_VAT`, `DPO_EMAIL` (si applicable). Tant que ces valeurs sont vides,
      les mentions affichent « [à compléter] ».
- [x] **DPA Anthropic** — **acquis automatiquement** : le DPA (avec SCC) est
      incorporé aux *Commercial Terms of Service*, acceptés en créant le compte
      API (produit commercial). Base de transfert US = **SCC**. Entraînement sur
      les données **exclu par défaut** en commercial. Concerne l'assistant in-app
      (clé API = responsable → sous-traitant). Le connecteur MCP via l'app Claude
      perso de l'utilisateur relève de la relation *utilisateur ↔ Anthropic*
      (mentionné dans la politique de confidentialité).
      DPA : https://www.anthropic.com/legal/commercial-terms
  - [ ] *(optionnel)* Demander le **Zero Data Retention (ZDR)** à Anthropic si on
        veut supprimer la rétention par défaut (~30 j). Non requis, mais un plus.
- [ ] **Signer le DPA Hetzner** (Auftragsverarbeitungsvertrag) — disponible dans
      la console (hébergeur des données, UE).
- [ ] **Compléter et tenir le registre des traitements** (`registre-des-traitements.md`).
- [ ] **Finaliser l'AIPD / DPIA** (`aipd-dpia.md`) — probablement obligatoire
      (données de santé à grande échelle).
- [x] **Procédure de violation de données** (72 h) : voir
      `procedure-violation-donnees.md` (playbook, critères de risque, modèles de
      notification APD/personnes, registre des violations). ✅ Clé API Anthropic
      ayant fuité : **rotée**.
- [ ] **Vérifier la classification « dispositif médical » (MDR)** : rester sur du
      bien-être, sans allégation de diagnostic/traitement. OK en l'état.
- [ ] Faire **relire le tout par un juriste / DPO**.

## Autorité de contrôle

Belgique — Autorité de protection des données (APD / GBA) :
https://www.autoriteprotectiondonnees.be

## Versionnement

La version des documents légaux est `LEGAL_VERSION` dans `src/lib/legal.ts`.
À incrémenter (nouvelle date) à chaque modification substantielle : le
consentement des utilisateurs est horodaté avec cette version.
