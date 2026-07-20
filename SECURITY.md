# Politique de sécurité

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir d'issue publique pour une faille de sécurité.

Utilisez plutôt le signalement privé de GitHub :
**onglet _Security_ du dépôt → _Report a vulnerability_**
(GitHub Security Advisories).

Décrivez :

- le composant concerné et la version / le commit,
- les étapes de reproduction,
- l'impact potentiel.

Nous accusons réception dès que possible et vous tenons informé de la correction.
Merci de laisser un délai raisonnable de correction avant toute divulgation
publique.

## Périmètre

Comme il s'agit d'un logiciel auto-hébergé, la sécurité d'une instance dépend
aussi de sa configuration : secrets forts (`SESSION_SECRET`, `MCP_TOKEN`…), HTTPS
en façade, Postgres non exposé publiquement, mises à jour régulières. Le
[README](README.md) rappelle ces prérequis.
