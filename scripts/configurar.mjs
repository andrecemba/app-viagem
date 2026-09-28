// Configuração guiada do painel: pergunta e-mail e senha e grava o arquivo .env.local.
// Uso: npm run configurar
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const FILE = ".env.local";

// Uma única leitura do teclado para todas as perguntas.
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
const lines = rl[Symbol.asyncIterator]();
let muted = false;
const write = rl._writeToOutput?.bind(rl);
if (write) rl._writeToOutput = (s) => (muted && !s.includes("\n") ? rl.output.write("*") : write(s));

async function ask(question, { hidden = false } = {}) {
  process.stdout.write(question);
  muted = hidden && Boolean(process.stdin.isTTY);
  const { value, done } = await lines.next();
  muted = false;
  if (hidden && process.stdin.isTTY) process.stdout.write("\n");
  if (done) {
    console.log("\nConfiguração interrompida.");
    process.exit(1);
  }
  return String(value).trim();
}

function setVar(text, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
}

console.log("\nConfiguração do painel administrativo (/admin)\n");
let email = "";
while (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = await ask("E-mail para entrar no painel: ");
let password = "";
for (;;) {
  password = await ask("Crie uma senha (mínimo 12 caracteres, não aparece na tela): ", { hidden: true });
  if (password.length < 12) {
    console.log("A senha precisa ter pelo menos 12 caracteres.");
    continue;
  }
  const again = await ask("Digite a senha de novo: ", { hidden: true });
  if (again === password) break;
  console.log("As senhas não conferem. Vamos tentar de novo.");
}

const salt = randomBytes(16);
const hash = `scrypt:${salt.toString("base64url")}:${scryptSync(password, salt, 64).toString("base64url")}`;
let text = existsSync(FILE) ? readFileSync(FILE, "utf8") : readFileSync(".env.example", "utf8");
text = setVar(text, "ADMIN_EMAIL", email.toLowerCase());
text = setVar(text, "ADMIN_PASSWORD_HASH", hash);
if (!/^ADMIN_SESSION_SECRET=.{32,}$/m.test(text)) text = setVar(text, "ADMIN_SESSION_SECRET", randomBytes(36).toString("base64url"));
if (!/^CRON_SECRET=.{32,}$/m.test(text)) text = setVar(text, "CRON_SECRET", randomBytes(24).toString("hex"));
writeFileSync(FILE, text, { mode: 0o600 });
rl.close();

console.log(`\nPronto! Configuração salva em ${FILE}.`);
console.log("Agora rode:  npm run dev   e abra  http://localhost:3000/admin\n");
