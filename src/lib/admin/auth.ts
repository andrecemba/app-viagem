import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_COOKIE, SESSION_TTL_SECONDS, sessionSecret, signSession, verifySessionToken } from "./session";

/** Camada de acesso: toda página e ação administrativa chama `requireAdmin()`. */
export const getAdminSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, sessionSecret());
});

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/entrar");
  return { email: session.sub, actor: `admin:${session.sub}` };
}

export async function startSession(email: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET ausente ou curto (mínimo 32 caracteres).");
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  (await cookies()).set(SESSION_COOKIE, signSession({ sub: email, exp }, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// Limite simples de tentativas por IP (memória do processo).
const attempts = new Map<string, { count: number; until: number }>();

export function loginBlocked(ip: string, now = Date.now()) {
  const a = attempts.get(ip);
  return Boolean(a && a.count >= 5 && a.until > now);
}

export function registerLoginFailure(ip: string, now = Date.now()) {
  const a = attempts.get(ip);
  const count = a && a.until > now ? a.count + 1 : 1;
  attempts.set(ip, { count, until: now + 15 * 60_000 });
}

export function clearLoginFailures(ip: string) {
  attempts.delete(ip);
}
