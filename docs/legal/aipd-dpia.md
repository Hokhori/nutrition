# Analyse d'impact relative à la protection des données (AIPD / DPIA)

> Brouillon (RGPD art. 35). Une AIPD est **probablement obligatoire** : traitement
> de **données de santé** (catégorie particulière) de manière régulière, via des
> outils incluant une IA. Les données de santé figurent sur la liste des
> traitements soumis à AIPD publiée par l'APD belge. À finaliser et faire valider.

## 1. Description systématique du traitement

- **Nature** : application web de suivi calorique/nutritionnel multi-utilisateurs,
  avec serveur MCP et assistant IA optionnels.
- **Finalités** : suivi des apports, du poids et de l'activité ; calcul d'un
  objectif calorique indicatif (Mifflin-St Jeor).
- **Données** : santé (poids, apports, objectifs), identifiants de compte, données
  techniques. Voir `registre-des-traitements.md`.
- **Périmètre** : utilisateurs inscrits sur l'instance publique.
- **Acteurs** : exploitant (responsable), Hetzner (hébergeur, UE), Anthropic
  (sous-traitant IA, US, si activé), OpenFoodFacts.

## 2. Nécessité et proportionnalité

- **Base légale** : consentement explicite (art. 9.2.a) pour les données de santé ;
  contrat pour le compte.
- **Minimisation** : seules les données saisies par l'utilisateur sont traitées ;
  pas de collecte publicitaire ni de profilage tiers.
- **Limitation de conservation** : suppression à la clôture du compte ;
  self-service d'effacement.
- **Droits** : information (pages légales), accès/portabilité (export JSON),
  rectification (dans l'app), effacement (suppression de compte), retrait du
  consentement.

## 3. Risques pour les personnes concernées

| Risque | Gravité | Vraisemblance | Mesures |
| --- | --- | --- | --- |
| Accès non autorisé aux données de santé | Élevée | Moyenne | HTTPS, hash scrypt, cookie httpOnly/secure, cloisonnement `user_id`, jetons révocables |
| Fuite d'un jeton MCP/OAuth | Élevée | Moyenne | Jeton par utilisateur, régénérable ; portée limitée au compte |
| Transfert hors UE via l'assistant IA | Élevée | Moyenne | Usage facultatif + consenti ; SCC/DPF ; DPA ; opt-out entraînement ; viser zéro-rétention |
| Exposition d'un secret (clé API, etc.) | Élevée | Faible→réelle | `.env` en 600, secrets hors dépôt ; **roter la clé Anthropic ayant fuité** |
| Données de tiers dans le catalogue partagé / OFF | Moyenne | Faible | Consigne « pas de données personnelles » dans les CGU |
| Absence d'administrateur après suppression | Moyenne | Faible | Garde-fou : refus de supprimer le dernier admin |

## 4. Mesures et plan d'action

- [ ] Signer les DPA (Anthropic, Hetzner) et documenter les garanties de transfert.
- [ ] Définir la durée de rétention des journaux techniques.
- [ ] Roter/révoquer la clé API Anthropic exposée.
- [ ] Mettre en place la procédure de notification de violation (72 h).
- [ ] Revue périodique (annuelle) de cette AIPD.

## 5. Avis

- **DPO** : *[avis à recueillir si un DPO est désigné]*
- **Décision du responsable** : *[à consigner : traitement acceptable sous réserve
  des mesures ci-dessus]*
- **Consultation préalable de l'APD** : requise uniquement si un risque résiduel
  élevé subsiste malgré les mesures (art. 36).
