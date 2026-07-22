# Procédure de gestion des violations de données (RGPD art. 33-34)

> Procédure interne de nutrition.hokhori.be. L'application traite des **données de
> santé** (art. 9) : une violation est présumée à **risque élevé** sauf preuve
> contraire, ce qui déclenche en général la notification aux personnes concernées.
> À adapter avec l'identité réelle de l'exploitant (voir `.env` / `src/lib/legal.ts`).

## 0. Rôles

| Rôle | Personne | Responsabilité |
| --- | --- | --- |
| Responsable de traitement | Logan Hendryckx | Décision de notifier, communication à l'APD |
| Point de contact RGPD | privacy@hokhori.be | Coordination, tenue du registre des violations |
| Technique | Logan Hendryckx (admin VPS Hokhori) | Confinement, investigation, rotation des secrets |

Contact unique pour signalement interne/externe : voir `SECURITY.md` du dépôt.

## 1. Qu'est-ce qu'une violation ?

Toute atteinte à la sécurité entraînant, de manière accidentelle ou illicite :
- **Confidentialité** : accès/divulgation non autorisés (fuite de la base, d'un
  secret, d'un jeton, d'un export utilisateur, accès admin compromis).
- **Intégrité** : altération non autorisée de données.
- **Disponibilité** : perte, destruction, indisponibilité durable (ex. base
  corrompue sans sauvegarde exploitable, ransomware).

Exemples concrets pour cette app : dump de la base Postgres, fuite d'un secret
(`SESSION_SECRET`, `MCP_TOKEN`, `OAUTH_*`, `DB_PASSWORD`, `ANTHROPIC_API_KEY`),
compromission d'un jeton MCP/OAuth d'un utilisateur, incident chez un
sous-traitant (Hetzner, Anthropic), export de données envoyé au mauvais
destinataire.

## 2. Le décompte des 72 heures

- L'horloge démarre au moment où l'exploitant **prend connaissance** de la
  violation avec un degré raisonnable de certitude (pas au moment de l'incident,
  mais dès qu'on sait qu'il a probablement eu lieu).
- **Délai : 72 h maximum** pour notifier l'Autorité de protection des données,
  **sauf** si la violation est **peu susceptible d'engendrer un risque** pour les
  personnes (dans ce cas : pas de notification à l'APD, mais consignation au
  registre — voir §6).
- Si tous les éléments ne sont pas connus à 72 h : notifier quand même de façon
  **échelonnée** (art. 33.4), en complétant ensuite.
- Un sous-traitant qui subit une violation doit **nous** alerter « sans délai » ;
  notre horloge démarre à sa notification.

## 3. Déroulé (playbook)

**T0 — Détecter & qualifier**
- Source : logs, alerte, signalement utilisateur (`SECURITY.md`), avis d'un
  sous-traitant (Hetzner/Anthropic).
- Enregistrer date/heure de prise de connaissance → démarre les 72 h.

**T0 + quelques heures — Confiner (technique)**
- Couper l'accès compromis ; isoler si nécessaire (`docker compose stop`).
- **Roter les secrets concernés** dans `~/stacks/nutrition/.env` puis redéployer :
  - `SESSION_SECRET` → **invalide toutes les sessions web** (déconnexion globale).
  - `MCP_TOKEN`, `OAUTH_CLIENT_SECRET`, `OAUTH_JWT_SECRET` → coupe les accès API/MCP.
  - Jeton MCP perso d'un utilisateur → régénération (profil, ou `regenerateMcpToken`).
  - `DB_PASSWORD` (+ recréer l'utilisateur DB), `ANTHROPIC_API_KEY` (révoquer côté console).
- Forcer le changement des mots de passe concernés si pertinent.
- Préserver les preuves (copie des logs, snapshot) avant nettoyage.

**T0 → T+72 h — Évaluer le risque** (voir §4) et **décider** de notifier ou non.

**≤ 72 h — Notifier l'APD** si risque (voir §5).

**Sans délai — Notifier les personnes** si risque **élevé** (voir §5).

**Après — Clore** : mesures correctives durables, mise à jour de la DPIA,
consignation au registre.

## 4. Critères d'évaluation du risque

Peser : nature des données (**santé = sensible → risque relevé**), volume et
nombre de personnes, facilité de ré-identification, gravité des conséquences
(atteinte à la vie privée, discrimination), réversibilité, mesures atténuantes
déjà en place (ex. données chiffrées/inaccessibles, secret roté avant exploitation).

> Règle pratique : fuite de contenu de la base (poids, apports, email) →
> **risque élevé → notifier APD + personnes**. Fuite d'un secret sans preuve
> d'exploitation et roté immédiatement → risque à documenter, souvent APD sans
> notification individuelle.

## 5. Notifications

### 5.1 À l'Autorité de protection des données (art. 33)

- **Belgique — APD/GBA** : formulaire de notification de fuite de données →
  https://www.autoriteprotectiondonnees.be (rubrique « Signaler une fuite »).
  contact@apd-gba.be — Rue de la Presse 35, 1000 Bruxelles.
- Contenu minimal (art. 33.3) — voir modèle §5.3.

### 5.2 Aux personnes concernées (art. 34)

Requise si **risque élevé**, « dans les meilleurs délais », en langage clair.
**Exemptions** possibles si : (a) données rendues incompréhensibles (chiffrement)
pour un tiers, (b) mesures ultérieures écartant le risque élevé, ou (c) effort
disproportionné → communication publique équivalente.
Canal ici : **email** à chaque utilisateur concerné (+ bandeau in-app au besoin).

### 5.3 Modèle — notification APD

```
Objet : Notification de violation de données à caractère personnel

1. Responsable : [OPERATOR_NAME], [OPERATOR_ADDRESS], [OPERATOR_EMAIL]
   Point de contact : [DPO_EMAIL]
2. Date/heure de la violation (ou estimation) : …
   Date/heure de prise de connaissance : …
3. Nature de la violation : [confidentialité / intégrité / disponibilité]
   Description : …
4. Catégories de données concernées : données de santé (poids, apports,
   objectifs), email, [autres]. Données NON concernées : mots de passe (hachés),
   […].
5. Catégories et nombre approximatif de personnes concernées : …
   Nombre approximatif d'enregistrements : …
6. Conséquences probables : …
7. Mesures prises ou proposées : confinement, rotation des secrets […],
   mesures pour atténuer les effets : …
8. Notification aux personnes : [oui/non + date + canal]
9. Notification échelonnée : [oui/non — éléments à compléter]
```

### 5.4 Modèle — email aux personnes concernées

```
Objet : Information importante concernant la sécurité de vos données

Bonjour,

Nous vous informons qu'un incident de sécurité survenu le [date] a pu affecter
certaines de vos données sur nutrition.hokhori.be : [décrire — ex. poids,
apports alimentaires, adresse email].

Ce qui s'est passé : [explication simple].
Ce que nous avons fait : [confinement, rotation des accès, …].
Ce que nous vous recommandons : [ex. changer votre mot de passe si réutilisé
ailleurs ; rester vigilant face à d'éventuels emails frauduleux].

Vos mots de passe étaient stockés de façon hachée et [n'ont pas / ont pu être]
concernés.

Pour toute question : [OPERATOR_EMAIL / DPO_EMAIL].
Vous pouvez aussi contacter l'Autorité de protection des données
(www.autoriteprotectiondonnees.be).

[OPERATOR_NAME]
```

## 6. Registre interne des violations (art. 33.5 — obligatoire)

Consigner **toute** violation, y compris celles non notifiées, avec la
justification de la décision.

| Date connaissance | Description | Données / personnes | Risque évalué | Notif. APD (date) | Notif. personnes (date) | Mesures | Décision & justification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

## 7. Coordonnées utiles

- **APD Belgique** : https://www.autoriteprotectiondonnees.be
- **Hetzner** (hébergeur, incidents/abuse) : via la console + abuse@hetzner.com
- **Anthropic** (sous-traitant IA) : contact sécurité/privacy indiqué au DPA
- **Signalement de vulnérabilité** : voir `SECURITY.md` du dépôt
