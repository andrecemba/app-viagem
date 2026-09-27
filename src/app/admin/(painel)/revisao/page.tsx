import type { Metadata } from "next";
import Link from "next/link";

import { btn, DemoBadge, EmptyState, Flash, formatDateTime, input, PageHeader, SeverityBadge, Tag } from "@/components/admin/ui";
import { productLabel } from "@/lib/admin/alerts";
import { requireAdmin } from "@/lib/admin/auth";
import { ALERT_TYPE_LABEL, SEVERITY_LABEL, SEVERITY_ORDER } from "@/lib/admin/labels";
import { adminRepo } from "@/lib/admin/repository";
import type { AdminAlert, AlertType } from "@/lib/admin/types";

import { hideOfferAction, ignoreAlertAction, reopenAlertAction } from "../../actions";

export const metadata: Metadata = { title: "Fila de revisão" };

/** Para onde "Corrigir" leva, conforme o tipo do alerta. */
function fixHref(a: AdminAlert): string {
  const offer = a.offerId ? `/admin/ofertas/${a.offerId}` : null;
  const product = a.productId ? `/admin/produtos/${a.productId}` : null;
  const map: Partial<Record<AlertType, string | null>> = {
    preco_desatualizado: offer && `${offer}#campo-price`,
    falha_repetida: offer && `${offer}#situacao`,
    integracao_pendente: "/admin/lojas",
    link_afiliado: offer && `${offer}#campo-affiliateUrl`,
    divergencia: offer && `${offer}#vinculo`,
    mudanca_vendedor: offer && `${offer}#campo-sellerName`,
    mudanca_variacao: offer && `${offer}#campo-variationLabel`,
    preco_fora_da_curva: offer && `${offer}#campo-price`,
    indisponivel: offer && `${offer}#campo-availability`,
    imagem: product && `${product}#campo-imageUrl`,
    possivel_duplicata: product && `/admin/produtos?q=${encodeURIComponent(a.title.split(": ")[1]?.split(" · ")[0] ?? "")}`,
    sem_elegibilidade: offer && `${offer}#comissao`,
    valor_automatico_divergente: offer ? `${offer}#campos` : product && `${product}#campos`,
    dados_pendentes: product && `${product}#campos`,
    revisao_agendada: product && `${product}#campos`,
  };
  return map[a.type] ?? offer ?? product ?? "/admin";
}

export default async function ReviewPage({ searchParams }: PageProps<"/admin/revisao">) {
  await requireAdmin();
  const [db, sp] = await Promise.all([adminRepo.read(), searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const estado = (one(sp.estado) ?? "aberto") as AdminAlert["status"];
  const tipo = one(sp.tipo) as AlertType | undefined;
  const produto = one(sp.produto);
  const productById = new Map(db.products.map((p) => [p.id, p]));

  const scoped = db.alerts.filter((a) => (!tipo || a.type === tipo) && (!produto || a.productId === produto));
  const list = scoped.filter((a) => a.status === estado).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  const counts = { aberto: 0, ignorado: 0, resolvido: 0 };
  for (const a of scoped) counts[a.status]++;
  const typeCounts = Object.entries(
    db.alerts.filter((a) => a.status === estado).reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.type]: (acc[a.type] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { estado: estado === "aberto" ? undefined : estado, tipo, produto, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/revisao${p.size ? `?${p}` : ""}`;
  };
  const returnTo = qs({});

  const lastAction = (a: AdminAlert) =>
    db.history
      .filter((h) => (a.offerId ? h.offerId === a.offerId : a.productId ? h.productId === a.productId && !h.offerId : false) && h.at >= a.firstSeenAt && h.actor !== "sistema")
      .sort((x, y) => y.at.localeCompare(x.at))[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fila de revisão"
        description="Alertas agrupados por gravidade. Um problema contínuo gera um único alerta: a cada verificação só a data e a contagem mudam."
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label="Estado" className="flex gap-1">
          {(["aberto", "ignorado", "resolvido"] as const).map((s) => (
            <Link
              key={s}
              href={qs({ estado: s === "aberto" ? undefined : s })}
              aria-current={s === estado ? "page" : undefined}
              className={"rounded-md px-2.5 py-1 text-sm " + (s === estado ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
              {s === "aberto" ? "Abertos" : s === "ignorado" ? "Ignorados" : "Resolvidos"} <span className="tabular-nums opacity-70">{counts[s]}</span>
            </Link>
          ))}
        </nav>
        <form action="/admin/revisao" className="flex gap-2">
          {estado !== "aberto" && <input type="hidden" name="estado" value={estado} />}
          {produto && <input type="hidden" name="produto" value={produto} />}
          <select name="tipo" defaultValue={tipo ?? ""} className={input + " w-64"} aria-label="Tipo de alerta">
            <option value="">Todos os tipos</option>
            {typeCounts.map(([t, n]) => (
              <option key={t} value={t}>
                {ALERT_TYPE_LABEL[t as AlertType]} ({n})
              </option>
            ))}
          </select>
          <button className={btn.secondary} type="submit">
            Filtrar
          </button>
        </form>
        {(tipo || produto) && (
          <Link href={qs({ tipo: undefined, produto: undefined })} className="text-sm underline underline-offset-4">
            Limpar filtros{produto && productById.get(produto) ? ` (produto: ${productLabel(productById.get(produto)!)})` : ""}
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState title={estado === "aberto" ? "Nenhum alerta aberto aqui." : `Nenhum alerta ${estado === "ignorado" ? "ignorado" : "resolvido"}.`}>
          {estado === "aberto" ? "Quando uma verificação encontrar um problema, ele aparece nesta fila." : null}
        </EmptyState>
      ) : (
        SEVERITY_ORDER.map((sev) => {
          const group = list.filter((a) => a.severity === sev);
          if (!group.length) return null;
          return (
            <section key={sev} aria-labelledby={`grupo-${sev}`}>
              <h2 id={`grupo-${sev}`} className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <SeverityBadge severity={sev} /> {SEVERITY_LABEL[sev]} · {group.length}
              </h2>
              <ol className="divide-y rounded-md border">
                {group.map((a) => {
                  const product = a.productId ? productById.get(a.productId) : null;
                  const action = lastAction(a);
                  return (
                    <li key={a.id} id={`alerta-${a.id}`} className="scroll-mt-20 px-3 py-3 text-sm target:bg-amber-50 dark:target:bg-amber-950">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium">
                            {a.title} {a.demo && <DemoBadge />}
                          </p>
                          <p className="text-muted-foreground">{a.detail}</p>
                          <p className="text-xs text-muted-foreground">
                            <Tag>{ALERT_TYPE_LABEL[a.type]}</Tag> Começou {formatDateTime(a.firstSeenAt)} · visto pela última vez {formatDateTime(a.lastSeenAt)} ·{" "}
                            {a.occurrences} avaliação(ões)
                            {a.lastAttemptAt && <> · última tentativa de consulta {formatDateTime(a.lastAttemptAt)}</>}
                            {product && (
                              <>
                                {" "}· produto{" "}
                                <Link href={`/admin/produtos/${product.id}`} className="underline underline-offset-4">
                                  {productLabel(product)}
                                </Link>
                              </>
                            )}
                          </p>
                          <p className="text-xs">
                            <span className="font-medium">Ação sugerida:</span> {a.suggestedAction}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">O que foi feito:</span>{" "}
                            {a.resolution
                              ? `${a.resolution.action === "ignorado" ? "Ignorado" : "Resolvido"} por ${a.resolution.by} em ${formatDateTime(a.resolution.at)} — ${a.resolution.note}`
                              : action
                                ? `${action.message} (${action.actor}, ${formatDateTime(action.at)})`
                                : "nada registrado ainda."}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-start gap-2">
                          {a.status === "aberto" && (
                            <Link href={fixHref(a)} className={btn.primary}>
                              Corrigir
                            </Link>
                          )}
                          {a.status === "aberto" && a.offerId && (
                            <form action={hideOfferAction}>
                              <input type="hidden" name="id" value={a.offerId} />
                              <input type="hidden" name="ocultar" value="1" />
                              <input type="hidden" name="motivo" value={`Alerta: ${ALERT_TYPE_LABEL[a.type]}`} />
                              <input type="hidden" name="voltar" value={returnTo} />
                              <button className={btn.secondary} type="submit">
                                Ocultar oferta
                              </button>
                            </form>
                          )}
                          <Link href={`${a.offerId ? `/admin/ofertas/${a.offerId}` : a.productId ? `/admin/produtos/${a.productId}` : "/admin/execucoes"}#historico`} className={btn.ghost}>
                            Ver histórico
                          </Link>
                          {a.status !== "aberto" && (
                            <form action={reopenAlertAction}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="voltar" value={returnTo} />
                              <button className={btn.ghost} type="submit">
                                Reabrir
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                      {a.status === "aberto" && (
                        <details className="mt-2 [&_summary::-webkit-details-marker]:hidden">
                          <summary className="inline-flex cursor-pointer list-none text-xs font-medium underline underline-offset-4">Ignorar com justificativa</summary>
                          <form action={ignoreAlertAction} className="mt-2 flex max-w-xl flex-col gap-2 sm:flex-row">
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="voltar" value={returnTo} />
                            <input name="justificativa" required minLength={5} placeholder="Por que este alerta pode ser ignorado?" className={input} />
                            <button className={btn.secondary} type="submit">
                              Ignorar
                            </button>
                          </form>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })
      )}
    </div>
  );
}
