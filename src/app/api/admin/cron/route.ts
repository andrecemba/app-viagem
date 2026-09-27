import { timingSafeEqual } from "node:crypto";

import { runChecks } from "@/lib/admin/checks";
import { adminRepo } from "@/lib/admin/repository";

/**
 * Execução agendada (ex.: a cada hora; cada loja só é consultada quando vence
 * a própria frequência). Protegida por `Authorization: Bearer <CRON_SECRET>`.
 * Sem CRON_SECRET configurado, a rota fica desligada.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return Response.json({ error: "Agendamento não configurado." }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  let summary = {};
  await adminRepo.update(async (db) => {
    const { db: next, run } = await runChecks(db, { trigger: "agendada" });
    summary = { id: run.id, stores: run.stores };
    return next;
  });
  return Response.json({ ok: true, run: summary });
}
