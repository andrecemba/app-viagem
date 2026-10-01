// Gera o valor de ADMIN_PASSWORD_HASH: node scripts/admin-hash-senha.mjs "sua senha"
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Informe uma senha com pelo menos 12 caracteres: npm run admin:hash-senha -- \"sua senha\"");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`);
