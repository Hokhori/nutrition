// Génère les secrets nécessaires et les affiche prêts à coller dans .env.
//
//   node scripts/generate-secrets.mjs                 # génère les secrets aléatoires
//   node scripts/generate-secrets.mjs "monMotDePasse" # + hash du mot de passe admin
//
// N'écrit rien sur le disque : copiez la sortie dans votre fichier .env.
import { scryptSync, randomBytes } from "node:crypto";

const b64 = (n) => randomBytes(n).toString("base64");
const hex = (n) => randomBytes(n).toString("hex");

const pw = process.argv[2];

const lines = [
  `SESSION_SECRET=${b64(32)}`,
  `OAUTH_JWT_SECRET=${b64(32)}`,
  `MCP_TOKEN=${hex(32)}`,
  `OAUTH_CLIENT_ID=${hex(16)}`,
  `OAUTH_CLIENT_SECRET=${hex(32)}`,
];

if (pw) {
  const saltHex = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, saltHex, 64).toString("hex");
  lines.push(`WEB_PASSWORD_HASH=scrypt:${saltHex}:${hash}`);
} else {
  lines.push("# WEB_PASSWORD_HASH= (relancez avec un mot de passe en argument pour le générer)");
}

console.log("# --- Secrets générés — collez ces lignes dans votre .env ---");
console.log(lines.join("\n"));
if (!pw) {
  console.log('#\n# Astuce : node scripts/generate-secrets.mjs "<mot-de-passe-admin>" ajoute aussi WEB_PASSWORD_HASH');
}
