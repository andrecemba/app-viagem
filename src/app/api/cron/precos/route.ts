import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { syncAll } from "@/lib/integrations/sync";

/**
 * Atualização programada de preços. Chamar de hora em hora (cron do servidor,
 * Vercel Cron, GitHub Actions) com `Authorization: Bearer $CRON_SECRET`.
 * Cada oferta só é consultada quando vence o prazo (padrão 48 h, em Lojas).
 */
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (secret.length < 32 || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

async function run(request: NextRequest) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32) {
    return NextResponse.json({ erro: "CRON_SECRET não configurado (mínimo 32 caracteres)." }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const reports = await syncAll(getDb(), "agendada");
  return NextResponse.json({ ok: true, lojas: reports });
}

export const POST = run;
export const GET = run;
