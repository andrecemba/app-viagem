import type { Metadata } from "next";
import Link from "next/link";

import { btn, DemoBadge, EmptyState, Flash, formatAge, formatDateTime, PageHeader, Section, SeverityBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { integrationState } from "@/lib/admin/checks";
import { ALERT_TYPE_LABEL, SEVERITY_ORDER } from "@/lib/admin/labels";
import { adminRepo } from "@/lib/admin/repository";

import { checkNowAction, demoModeAction } from "../actions";

export const metadata: Metadata = { title: "Visão geral" };

export default async function OverviewPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const [db, sp] = await Promise.all([adminRepo.read(), searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const now = new Date();

  const published = db.products.filter((p) => p.status === "publicado").length;
  const activeOffers = db.offers.filter((o) => !o.hidden && o.fields.availability.value === "disponivel").length;
  const failing = db.offers.filter((o) => o.consecutiveFailures > 0).length;
  const linksToReview = new Set(db.alerts.filter((a) => a.status === "aberto" && a.type === "link_afiliado").map((a) => a.offerId)).size;
  const open = db.alerts.filter((a) => a.status === "aberto");
  const attention = open
    .filter((a) => a.severity !== "baixa")
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || b.lastSeenAt.localeCompare(a.lastSeenAt));
  const lowByType = Object.entries(
    open.filter((a) => a.severity === "baixa").reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.type]: (acc[a.type] ?? 0) + 1 }), {}),
  );
  const lastRun = db.runs[0];

  const stats = [
    { label: "Produtos publicados", value: published, hint: `de ${db.products.length} fichas`, href: "/admin/produtos?estado=publicado" },
    { label: "Ofertas ativas", value: activeOffers, hint: `${db.offers.length} cadastradas`, href: "/admin/ofertas" },
    { label: "Consultas com falha", value: failing, hint: "ofertas com erro na última consulta", href: "/admin/ofertas?situacao=falha" },
    { label: "Links para revisar", value: linksToReview, hint: "afiliado vazio, inválido ou quebrado", href: "/admin/revisao?tipo=link_afiliado" },
    { label: "Alertas pendentes", value: open.length, hint: `${attention.length} médios ou mais graves`, href: "/admin/revisao" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visão geral"
        description="Situação do catálogo, das ofertas e da atualização automática."
        actions={
          <form action={checkNowAction}>
            <input type="hidden" name="voltar" value="/admin" />
            <button className={btn.secondary} type="submit">
              Executar verificação agora
            </button>
          </form>
        }
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      <dl className="grid grid-cols-2 border-y sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group border-b px-1 py-4 sm:px-4 lg:border-b-0">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tabular-nums group-hover:underline">{s.value}</dd>
            <dd className="text-xs text-muted-foreground">{s.hint}</dd>
          </Link>
        ))}
      </dl>

      <Section
        id="atencao"
        title="O que precisa da minha atenção"
        description="Alertas de gravidade média ou maior, do mais grave para o menos grave."
        actions={<Link href="/admin/revisao" className={btn.ghost}>Abrir fila de revisão</Link>}
      >
        {attention.length ? (
          <ol className="divide-y rounded-md border">
            {attention.slice(0, 8).map((a) => (
              <li key={a.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2.5 text-sm sm:flex-nowrap">
                <SeverityBadge severity={a.severity} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {a.title} {a.demo && <DemoBadge />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ALERT_TYPE_LABEL[a.type]} · desde {formatDateTime(a.firstSeenAt)} · {a.occurrences} ocorrência(s) · {a.suggestedAction}
                  </p>
                </div>
                <Link href={`/admin/revisao#alerta-${a.id}`} className={btn.secondary + " shrink-0"}>
                  Resolver
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="Nada urgente agora.">Não há alertas de gravidade média ou maior.</EmptyState>
        )}
        {attention.length > 8 && <p className="mt-2 text-sm text-muted-foreground">E mais {attention.length - 8} na fila de revisão.</p>}
        {lowByType.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Pendências de baixa gravidade:{" "}
            {lowByType.map(([type, n], i) => (
              <span key={type}>
                {i > 0 && " · "}
                <Link className="underline underline-offset-4" href={`/admin/revisao?tipo=${type}`}>
                  {ALERT_TYPE_LABEL[type as keyof typeof ALERT_TYPE_LABEL]} ({n})
                </Link>
              </span>
            ))}
          </p>
        )}
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section id="automacao" title="Atualização automática">
          <ul className="divide-y rounded-md border text-sm">
            {db.stores.map((s) => {
              const st = integrationState(s);
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-right text-xs text-muted-foreground">
                    {st.status === "somente_manual" ? "Somente manual" : st.status === "configurada" ? "Configurada" : "Pendente de configuração"} · a cada {s.frequencyHours} h
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-sm text-muted-foreground">
            Última execução: {lastRun ? `${formatDateTime(lastRun.startedAt)} (${formatAge(lastRun.startedAt, now)})` : "nenhuma"}.{" "}
            <Link href="/admin/execucoes" className="underline underline-offset-4">Ver execuções</Link> ·{" "}
            <Link href="/admin/lojas" className="underline underline-offset-4">Configurar lojas</Link>
          </p>
        </Section>

        <Section id="demonstracao" title="Modo de demonstração">
          <div className="rounded-md border p-3 text-sm">
            <p className="text-muted-foreground">
              Cria ofertas, preços e execuções <strong className="text-foreground">fictícios</strong> para testar telas, verificações e alertas.
              Tudo recebe o selo <DemoBadge /> e pode ser removido de uma vez. Os 20 produtos reais não são alterados.
            </p>
            <form action={demoModeAction} className="mt-3">
              <input type="hidden" name="ligar" value={db.settings.demoMode ? "0" : "1"} />
              <button className={db.settings.demoMode ? btn.danger : btn.secondary} type="submit">
                {db.settings.demoMode ? "Remover dados de demonstração" : "Carregar dados de demonstração"}
              </button>
            </form>
          </div>
        </Section>
      </div>
    </div>
  );
}
