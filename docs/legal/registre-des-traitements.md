# Registre des activités de traitement (RGPD art. 30)

> À tenir à jour. Obligatoire ici car des **données de santé** sont traitées de
> façon non occasionnelle (l'exemption « < 250 salariés » ne s'applique pas,
> art. 30.5).
>
> Version : 2026-07-22.

## Responsable du traitement

| Champ | Valeur |
| --- | --- |
| Responsable | Logan Hendryckx (personne physique / indépendant) |
| Adresse | Avenue Ferdauci 1, 1020 Laeken, Belgique |
| Contact RGPD | privacy@hokhori.be |
| N° d'entreprise (BCE/KBO) | BE 1038.257.712 |
| N° de TVA | BE 1038.257.712 |
| DPO | Non désigné (non requis à ce stade — pas de traitement à grande échelle au sens de l'art. 37 ; le contact RGPD ci-dessus fait office de point de contact) |

---

## Traitement 1 — Comptes utilisateurs & authentification

| Élément | Détail |
| --- | --- |
| Finalité | Création de compte, authentification, gestion de session |
| Base légale | Exécution du contrat (art. 6.1.b) |
| Personnes concernées | Utilisateurs inscrits |
| Catégories de données | Email, hash du mot de passe, rôle, statut, preuve de consentement, jeton MCP/OAuth |
| Destinataires | Hébergeur (Hetzner, UE) |
| Transferts hors UE | Aucun |
| Durée de conservation | Durée de vie du compte ; effacement à la suppression |
| Mesures de sécurité | HTTPS, hash scrypt, cookie httpOnly/secure, cloisonnement par user |

## Traitement 2 — Suivi nutritionnel & de santé

| Élément | Détail |
| --- | --- |
| Finalité | Suivi des apports, du poids, de l'activité ; calcul d'objectifs caloriques indicatifs |
| Base légale | **Consentement explicite (art. 9.2.a)** — données de santé |
| Personnes concernées | Utilisateurs inscrits |
| Catégories de données | Poids et pesées, apports alimentaires, activité physique, sexe, année de naissance, taille, objectifs |
| Destinataires | Hébergeur (Hetzner, UE) |
| Transferts hors UE | Aucun (hors usage de l'assistant IA — cf. traitement 4) |
| Durée de conservation | Durée de vie du compte ; effacement à la suppression |
| Mesures de sécurité | Idem traitement 1 ; accès restreint aux données par `user_id` |

## Traitement 3 — Sécurité & journaux techniques

| Élément | Détail |
| --- | --- |
| Finalité | Sécurité, prévention des abus, diagnostic |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Catégories de données | Adresse IP, horodatage, métadonnées de requêtes |
| Destinataires | Hébergeur (Hetzner, UE) |
| Transferts hors UE | Aucun |
| Durée de conservation | **30 jours** (à aligner sur la rotation des logs Caddy/Docker) |

## Traitement 4a — Assistant IA in-app (si activé)

Traitement réalisé **par l'éditeur** : l'application appelle l'API Anthropic avec
sa propre clé. L'éditeur est responsable, Anthropic est sous-traitant.

| Élément | Détail |
| --- | --- |
| Finalité | Saisie et consultation en langage naturel via l'assistant intégré au site |
| Base légale | Consentement (art. 9.2.a) — usage facultatif |
| Catégories de données | Contenu des messages (peut inclure des données de santé) |
| Sous-traitant | **Anthropic, PBC (États-Unis)** |
| Transferts hors UE | Oui → **SCC** via le **DPA Anthropic** (incorporé aux *Commercial Terms of Service* acceptés à l'ouverture du compte API) |
| Entraînement modèles | Exclu par défaut sur l'API commerciale |
| Durée de conservation | Rétention par défaut d'Anthropic (~30 j) ; Zero Data Retention disponible sur demande (optionnel) |

## Traitement 4b — Connecteur MCP (à l'initiative de l'utilisateur)

> **Précision importante :** le DPA de l'éditeur couvre **uniquement** l'assistant
> IA in-app (traitement 4a). Si un utilisateur branche **son propre** assistant IA
> (ex. l'application Claude via son abonnement personnel) sur le connecteur MCP, les
> données transitent vers **son** fournisseur d'IA, sous **sa propre** relation
> contractuelle. Ce transfert n'est **ni réalisé ni couvert par l'éditeur** : le
> responsable de cette transmission est l'utilisateur, pas l'application.

| Élément | Détail |
| --- | --- |
| Rôle de l'éditeur | Fournit l'accès MCP (authentifié) à l'utilisateur ; ne transmet rien à un fournisseur d'IA tiers de sa propre initiative |
| Fournisseur d'IA | Celui choisi par l'utilisateur (hors périmètre de l'éditeur) |
| Transferts hors UE | Le cas échéant, sous la responsabilité et les conditions propres de l'utilisateur |
| Information | Rappelé à l'utilisateur dans la politique de confidentialité |

## Traitement 5 — Catalogue d'aliments & contribution OpenFoodFacts (si activée)

| Élément | Détail |
| --- | --- |
| Finalité | Base d'aliments partagée ; contribution facultative à OpenFoodFacts |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Catégories de données | Données produit (pas de données personnelles ; `created_by` anonymisé à la suppression du compte) |
| Destinataires | OpenFoodFacts (publication publique en cas de contribution) |
| Transferts hors UE | Selon l'infrastructure OpenFoodFacts |
