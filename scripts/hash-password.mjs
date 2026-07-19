// Génère un hash de mot de passe pour WEB_PASSWORD_HASH.
//   node scripts/hash-password.mjs "mon mot de passe"
// Format : scrypt:<salt-hex>:<hash-hex>
// (séparateur ':' et non '$' pour éviter l'interpolation de variables par
//  docker compose quand la valeur passe par un env_file.)
import { scryptSync, randomBytes } from "node:crypto";

const pw = process.argv[2];
if (!pw) {
  console.error('Usage : node scripts/hash-password.mjs "<mot de passe>"');
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(pw, salt, 64).toString("hex");
console.log(`scrypt:${salt}:${hash}`);
