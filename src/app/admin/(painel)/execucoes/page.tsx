import type { Metadata } from "next";
import Link from "next/link";

import { btn, DemoBadge, EmptyState, Flash, formatDateTime, PageHeader, Tag } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { adminRepo } from "@/lib/admin/repository";

import { checkNowAction } from "../../actions";

export const metadata: Metadata = { title: "Execuções" };

const TRIGGER_LABEL = { agendada: "Agendada", manual: "Manual (todas vencidas)", oferta: "Manual (ofertas escolhidas)" } as const;

function duration(start: string, end: string | null) {
  if (!end) return "em andamento";
  const s = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

export default async function RunsPage({ searchParams }: PageProps<"/admin/execucoes">) {
  await requireAdmin();
  const [db, sp] = await Promise.all([adminRepo.read(), searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const storeName = Object.fromEntries(db.stores.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Execuções"
        description="Histórico da atualização automática. Lojas sem integração configurada aparecem como “não consultadas”: nada é simulado como se fosse real."
        actions={
          <form action={checkNowAction}>
            <input type="hidden" name="voltar" value="/admin/execucoes" />
            <button className={btn.secondary} type="submit">
              Executar agora
            </button>
          </form>
        }
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      {db.runs.length === 0 ? (
        <EmptyState title="Nenhuma execução registrada.">
          A execução agendada roda pela rota protegida <code>/api/admin/cron</code> (ver <code>docs/ADMIN.md</code>). Também é possível executar
          manualmente.
        </EmptyState>
      ) : (
        <ol className="space-y-3">
          {db.runs.map((run) => {
            const totals = run.stores.reduce((a, s) => ({ c: a.c + s.consulted, u: a.u + s.updated, e: a.e + s.errors, k: a.k + s.skipped }), { c: 0, u: 0, e: 0, k: 0 });
            return (
              <li key={run.id} className="rounded-md border">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">{formatDateTime(run.startedAt)}</span>
                  <span className="text-muted-foreground">
                    até {formatDateTime(run.finishedAt)} · {duration(run.startedAt, run.finishedAt)}
                  </span>
                  <Tag>{TRIGGER_LABEL[run.trigger]}</Tag>
                  {run.demo && <DemoBadge />}
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {totals.c} consultadas · {totals.u} atualizadas · {totals.e} com erro · {totals.k} não consultadas
                  </span>
                </div>
                {run.stores.length ? (
                  <div className="relative overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-sm">
                      <thead className="text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-1.5 font-medium">Loja</th>
                          <th className="px-3 py-1.5 text-right font-medium">Consultadas</th>
                          <th className="px-3 py-1.5 text-right font-medium">Atualizadas</th>
                          <th className="px-3 py-1.5 text-right font-medium">Com erro</th>
                          <th className="px-3 py-1.5 text-right font-medium">Não consultadas</th>
                          <th className="px-3 py-1.5 font-medium">Mensagem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {run.stores.map((s) => (
                          <tr key={s.storeId}>
                            <td className="px-3 py-1.5">{storeName[s.storeId] ?? s.storeId}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{s.consulted}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{s.updated}</td>
                            <td className={"px-3 py-1.5 text-right tabular-nums " + (s.errors ? "font-semibold text-red-700 dark:text-red-400" : "")}>{s.errors}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{s.skipped}</td>
                            <td className="px-3 py-1.5 text-xs text-muted-foreground">{s.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma oferta vencida nesta execução.</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-sm text-muted-foreground">
        A frequência de consulta é definida por loja em{" "}
        <Link href="/admin/lojas" className="underline underline-offset-4">
          Lojas e integrações
        </Link>
        .
      </p>
    </div>
  );
}
