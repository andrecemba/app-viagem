import { createHmac, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Sessão do administrador: token `payload.assinatura` com HMAC-SHA256.
 * Sem dependências de React/Next, para ser usado no proxy, nas páginas e nos testes.
 */

export const SESSION_COOKIE = "rc_admin_session";
export const SESSION_TTL_SECONDS = 8 * 3600;

export interface SessionPayload {
  sub: string;
  exp: number;
}

export function sessionSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && sessionSecret());
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");

export function signSession(payload: SessionPayload, secret: string) {
  const body = b64(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined, secret: string | null, now = Date.now()): SessionPayload | null {
  if (!token || !secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number" || payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Formato do hash: `scrypt:<salt base64url>:<hash base64url>` (sem "$", que arquivos .env expandem). */
export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string | undefined) {
  if (!stored) return false;
  const [scheme, saltB64, hashB64] = stored.split(":");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}

export function checkCredentials(email: string, password: string) {
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const emailOk = Boolean(expectedEmail) && email.trim().toLowerCase() === expectedEmail;
  // Sempre calcula o hash, mesmo com e-mail errado, para não revelar qual campo falhou pelo tempo de resposta.
  const passwordOk = verifyPassword(password, process.env.ADMIN_PASSWORD_HASH ?? "scrypt:AAAA:AAAA");
  return emailOk && passwordOk;
}
