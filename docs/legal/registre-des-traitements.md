# Registre des activités de traitement (RGPD art. 30)

> Brouillon à compléter avec l'identité réelle de l'exploitant, puis à tenir à
> jour. Obligatoire ici car des **données de santé** sont traitées de façon non
> occasionnelle (l'exemption « < 250 salariés » ne s'applique pas, art. 30.5).

## Responsable du traitement

| Champ | Valeur |
| --- | --- |
| Nom / raison sociale | *[OPERATOR_NAME]* |
| Adresse | *[OPERATOR_ADDRESS]* |
| Contact | *[OPERATOR_EMAIL]* |
| N° d'entreprise (BCE/KBO) | *[OPERATOR_LEGAL_ID]* |
| DPO / point de contact RGPD | *[DPO_EMAIL — ou « non désigné »]* |

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
| Durée de conservation | Durée limitée (*à préciser, ex. 30–90 j*) |

## Traitement 4 — Assistant IA / connecteur MCP (si activé)

| Élément | Détail |
| --- | --- |
| Finalité | Saisie et consultation en langage naturel via un modèle de langage |
| Base légale | Consentement (art. 9.2.a) — l'usage est facultatif et à l'initiative de l'utilisateur |
| Catégories de données | Contenu des messages (peut inclure des données de santé) |
| Sous-traitant | **Anthropic, PBC (États-Unis)** |
| Transferts hors UE | Oui → **SCC / Data Privacy Framework** ; DPA + opt-out entraînement |
| Durée de conservation | Selon la politique d'Anthropic (viser zéro-rétention) |

## Traitement 5 — Catalogue d'aliments & contribution OpenFoodFacts (si activée)

| Élément | Détail |
| --- | --- |
| Finalité | Base d'aliments partagée ; contribution facultative à OpenFoodFacts |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Catégories de données | Données produit (pas de données personnelles ; `created_by` anonymisé à la suppression du compte) |
| Destinataires | OpenFoodFacts (publication publique en cas de contribution) |
| Transferts hors UE | Selon l'infrastructure OpenFoodFacts |
