import type { Metadata } from "next";
import Link from "next/link";

import { demoEventsAction, saveSettingsAction } from "@/app/admin/actions";
import { BarList, DailyColumns, Stat } from "@/components/admin/charts";
import { brl, btn, DemoBadge, EmptyState, Flash, input, PageHeader } from "@/components/admin/ui";
import { StoreLogo } from "@/components/icons/store-logo";
import { ADMIN_STORES } from "@/config/stores";
import { requireAdmin } from "@/lib/admin/auth";
import { adminRepo } from "@/lib/admin/repository";
import { buildReport, type RankRow } from "@/lib/analytics/report";
import { hasDemoEvents, readEvents } from "@/lib/analytics/store";
import { catalogSource } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dados" };

const PERIODS = [7, 30, 90] as const;

const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

function demandRows(rows: RankRow[]) {
  return rows.map((r) => ({
    key: r.key,
    label: r.label,
    value: r.views + r.filters,
    detail: [r.views && `${r.views} visitas`, r.filters && `${r.filters} no filtro`, r.clicks && `${r.clicks} cliques`].filter(Boolean).join(" · "),
  }));
}

function Panel({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-lg border p-4", className)}>
      <h2 className="font-display text-sm font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function DataPage({ searchParams }: PageProps<"/admin/dados">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const period = PERIODS.find((p) => String(p) === one(sp.periodo)) ?? 30;
  const demoAvailable = await hasDemoEvents();
  const source = one(sp.fonte) === "demo" && demoAvailable ? "demo" : "real";
  const db = await adminRepo.read();

  const to = new Date();
  const from = new Date(to.getTime() - (period - 1) * 86400_000);
  from.setHours(0, 0, 0, 0);
  const events = await readEvents(source, from.toISOString());
  const report = buildReport(events, { from, to, conversionRate: db.settings.conversionRate, commission: db.settings.commission });
  const t = report.totals;
  const ctr = t.views ? t.clicks / t.views : null;
  const isDemo = source === "demo";

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { periodo: String(period), fonte: isDemo ? "demo" : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "periodo" && v === "30")) p.set(k, v);
    return `/admin/dados${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dados"
        description="Como as pessoas usam o site: o que procuram, para quais lojas vão e quanto isso pode gerar de comissão. Sem dados pessoais (nada de IP, cookie ou identificação)."
        actions={
          <nav aria-label="Período" className="flex rounded-md border p-0.5">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={href({ periodo: String(p) })}
                aria-current={p === period ? "page" : undefined}
                className={cn("rounded px-2.5 py-1 text-sm", p === period ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {p} dias
              </Link>
            ))}
          </nav>
        }
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Fonte:</span>
        <Link href={href({ fonte: undefined })} className={cn("rounded-md border px-2.5 py-1", !isDemo && "border-foreground font-medium")}>
          Dados reais do site
        </Link>
        {demoAvailable && (
          <Link href={href({ fonte: "demo" })} className={cn("rounded-md border px-2.5 py-1", isDemo && "border-foreground font-medium")}>
            Demonstração
          </Link>
        )}
        <form action={demoEventsAction} className="ml-auto">
          <input type="hidden" name="acao" value={demoAvailable ? "remover" : "carregar"} />
          <button type="submit" className={btn.ghost}>
            {demoAvailable ? "Remover dados de demonstração" : "Carregar dados de demonstração"}
          </button>
        </form>
      </div>

      {isDemo && (
        <p className="rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm text-violet-950 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100">
          <DemoBadge /> <strong>Números fictícios</strong>, gerados para mostrar como a tela funciona. Não representam acessos reais.
        </p>
      )}
      {!isDemo && catalogSource() === "exemplo" && (
        <p className="text-xs text-muted-foreground">
          O site ainda mostra o catálogo de exemplo: os acessos reais abaixo são de rações ilustrativas.
        </p>
      )}

      {events.length === 0 ? (
        <EmptyState title="Nenhum acesso registrado neste período.">
          Buscas, filtros, visitas a produtos e cliques em “Ir à loja” aparecem aqui assim que alguém usar o site. Para ver a tela preenchida, carregue os
          dados de demonstração.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="rounded-lg border-2 border-foreground p-4">
              <p className="text-xs font-semibold">Cliques nos links das lojas</p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums">{t.clicks.toLocaleString("pt-BR")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ctr != null ? `${pct(ctr)} das visitas a produtos viraram clique` : "Sem visitas a produtos no período"}
              </p>
            </div>
            <Stat label="Visitas a produtos" value={t.views.toLocaleString("pt-BR")} />
            <Stat label="Buscas" value={t.searches.toLocaleString("pt-BR")} detail={`${report.zeroResultTerms.reduce((a, z) => a + z.count, 0)} sem resultado`} />
            <Stat
              label="Comissão estimada"
              value={report.estimate.total != null ? brl(report.estimate.total) : "—"}
              detail={report.estimate.total == null ? "Informe as taxas abaixo" : report.estimate.storesWithoutRate.length ? `Sem taxa informada: ${report.estimate.storesWithoutRate.join(", ")}` : `sobre ${brl(t.clickedValue)} em produtos clicados`}
            />
          </div>

          <Panel title="Cliques por dia" description={`Últimos ${period} dias.`}>
            <DailyColumns data={report.clicksByDay} label={`Cliques nos links das lojas por dia, últimos ${period} dias`} />
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Plataformas mais direcionadas" description="Para qual loja as pessoas foram ao clicar em “Ir à loja”.">
              <BarList
                valueLabel="cliques"
                rows={report.stores.map((s) => ({
                  key: s.store,
                  label: (
                    <span className="inline-flex items-center gap-2">
                      <StoreLogo slug={s.store} size={18} /> {s.name}
                    </span>
                  ),
                  value: s.clicks,
                  detail: `${pct(s.share)} dos cliques · ${brl(s.value)} em produtos`,
                }))}
              />
            </Panel>
            <Panel title="Rações mais procuradas" description="Visitas à página do produto e cliques para as lojas.">
              <BarList
                valueLabel="visitas"
                rows={report.products.map((p) => ({ key: p.key, label: p.label, value: p.views, detail: `${p.clicks} cliques${p.views ? ` · ${pct(p.clicks / p.views)} de conversão em clique` : ""}` }))}
              />
            </Panel>
            <Panel title="Marcas mais procuradas" description="Visitas a produtos da marca + vezes que a marca foi escolhida no filtro.">
              <BarList valueLabel="procuras" rows={demandRows(report.brands)} />
            </Panel>
            <Panel title="Tamanho da embalagem" description="Peso das rações visitadas e faixas escolhidas no filtro.">
              <BarList valueLabel="procuras" rows={demandRows(report.weights)} />
            </Panel>
            <Panel title="Tipo de alimento">
              <BarList valueLabel="procuras" rows={demandRows(report.kinds)} />
            </Panel>
            <Panel title="Porte do cachorro">
              <BarList valueLabel="procuras" rows={demandRows(report.dogSizes)} />
            </Panel>
            <Panel title="O que mais digitam na busca">
              <BarList valueLabel="buscas" rows={report.terms.map((q) => ({ key: q.q, label: `“${q.q}”`, value: q.count }))} />
            </Panel>
            <Panel title="Buscas sem resultado" description="Rações que as pessoas procuram e ainda não estão no catálogo.">
              <BarList valueLabel="vezes" empty="Nenhuma busca sem resultado." rows={report.zeroResultTerms.map((q) => ({ key: q.q, label: `“${q.q}”`, value: q.count }))} />
            </Panel>
          </div>
        </>
      )}

      <section aria-labelledby="comissao" className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 id="comissao" className="font-display text-sm font-semibold">
            Quanto de comissão os cliques podem gerar
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Estimativa = valor dos produtos clicados × conversão (quantos cliques viram compra) × comissão da loja. As lojas não informam as vendas para este
            site; confira o valor real no painel de cada programa de afiliados.
          </p>
        </div>
        {report.stores.length > 0 && (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-2 font-medium">Loja</th>
                  <th className="px-2 py-2 text-right font-medium">Cliques</th>
                  <th className="px-2 py-2 text-right font-medium">Valor clicado</th>
                  <th className="px-2 py-2 text-right font-medium">Comissão</th>
                  <th className="px-4 py-2 text-right font-medium">Estimativa</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.stores.map((s) => (
                  <tr key={s.store}>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-2">
                        <StoreLogo slug={s.store} size={18} /> {s.name}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{s.clicks}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{brl(s.value)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{s.commissionRate != null ? pct(s.commissionRate) : <span className="text-muted-foreground">não informada</span>}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{s.estimate != null ? brl(s.estimate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td className="px-4 py-2 font-medium">Total</td>
                  <td className="px-2 py-2 text-right tabular-nums">{t.clicks}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{brl(t.clickedValue)}</td>
                  <td className="px-2 py-2 text-right text-xs text-muted-foreground">conversão {report.estimate.conversionRate != null ? pct(report.estimate.conversionRate) : "não informada"}</td>
                  <td className="px-4 py-2 text-right font-display font-bold tabular-nums">{report.estimate.total != null ? brl(report.estimate.total) : "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <form action={saveSettingsAction} className="space-y-3 border-t bg-muted/30 px-4 py-3">
          <input type="hidden" name="voltar" value={href({})} />
          <p className="text-xs font-semibold">Taxas usadas na estimativa (em %). Use as do contrato de cada programa; em branco = fora da conta.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <label className="space-y-1 text-xs">
              <span className="font-medium">Conversão</span>
              <input name="conversao" inputMode="decimal" defaultValue={db.settings.conversionRate != null ? String(db.settings.conversionRate * 100).replace(".", ",") : ""} placeholder="ex.: 5" className={input} />
            </label>
            {ADMIN_STORES.map((s) => {
              const v = db.settings.commission[s.slug];
              return (
                <label key={s.slug} className="space-y-1 text-xs">
                  <span className="font-medium">{s.name}</span>
                  <input name={`comissao_${s.slug}`} inputMode="decimal" defaultValue={v != null ? String(Math.round(v * 10000) / 100).replace(".", ",") : ""} className={input} />
                </label>
              );
            })}
          </div>
          <button type="submit" className={btn.secondary}>
            Salvar taxas
          </button>
        </form>
      </section>
    </div>
  );
}
