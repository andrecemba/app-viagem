import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FieldEditor, type InputSpec } from "@/components/admin/field-editor";
import { HistoryList } from "@/components/admin/history-list";
import { brl, btn, DemoBadge, Flash, formatAge, formatDateTime, input, PageHeader, Section, SeverityBadge, Tag } from "@/components/admin/ui";
import { productLabel } from "@/lib/admin/alerts";
import { requireAdmin } from "@/lib/admin/auth";
import { integrationState } from "@/lib/admin/checks";
import { AVAILABILITY_LABEL, FIELD_LABEL, LIFE_STAGE_LABEL, SPECIES_LABEL, formatGrams } from "@/lib/admin/labels";
import { adminRepo } from "@/lib/admin/repository";
import type { AdminProduct, OfferFieldKey } from "@/lib/admin/types";

import { checkNowAction, editOfferFieldAction, eligibilityAction, hideOfferAction, offerFieldCommandAction, relinkOfferAction } from "../../../actions";

export const metadata: Metadata = { title: "Oferta" };

const OFFER_FIELDS: { key: OfferFieldKey; label: string; spec: InputSpec }[] = [
  { key: "price", label: "Preço (R$)", spec: { kind: "number", step: "0.01" } },
  { key: "availability", label: "Disponibilidade", spec: { kind: "select", options: Object.entries(AVAILABILITY_LABEL).map(([value, label]) => ({ value, label })) } },
  { key: "url", label: "URL do anúncio", spec: { kind: "url" } },
  { key: "affiliateUrl", label: "Link de afiliado", spec: { kind: "url" } },
  { key: "sellerName", label: "Vendedor", spec: { kind: "text" } },
  { key: "listingTitle", label: "Título do anúncio", spec: { kind: "text" } },
  { key: "variationLabel", label: "Variação escolhida", spec: { kind: "text", placeholder: "Ex.: 15 kg" } },
];

const DIFF_KEYS = ["brand", "line", "formula", "flavor", "weightGrams", "species", "lifeStage"] as const;

function diffValue(p: AdminProduct, key: (typeof DIFF_KEYS)[number]) {
  const v = p.fields[key].value;
  if (v == null) return "—";
  if (key === "weightGrams") return formatGrams(v as number);
  if (key === "species") return SPECIES_LABEL[v as keyof typeof SPECIES_LABEL];
  if (key === "lifeStage") return LIFE_STAGE_LABEL[v as keyof typeof LIFE_STAGE_LABEL];
  return String(v);
}

export default async function OfferPage({ params, searchParams }: PageProps<"/admin/ofertas/[id]">) {
  await requireAdmin();
  const [{ id }, sp, db] = await Promise.all([params, searchParams, adminRepo.read()]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const offer = db.offers.find((o) => o.id === id);
  if (!offer) notFound();
  const product = db.products.find((p) => p.id === offer.productId);
  const store = db.stores.find((s) => s.id === offer.storeId);
  const target = db.products.find((p) => p.id === one(sp.destino));
  const alerts = db.alerts.filter((a) => a.offerId === id && a.status === "aberto");
  const history = db.history.filter((h) => h.offerId === id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
  const integration = store ? integrationState(store) : null;
  const weight = product?.fields.weightGrams.value;
  const price = offer.fields.price.value;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted-foreground">
        <Link href="/admin/ofertas" className="hover:text-foreground hover:underline">
          Ofertas
        </Link>{" "}
        / <span className="text-foreground">{offer.externalId}</span>
      </nav>
      <PageHeader
        title={`${store?.name ?? offer.storeId} · ${product ? productLabel(product) : offer.productId}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {offer.demo && <DemoBadge />}
            {offer.hidden ? <Tag>Oculta: {offer.hidden.reason}</Tag> : <Tag tone="good">Visível</Tag>}
            <span>
              {brl(price)}
              {price && weight ? ` · ${brl((price / weight) * 1000)}/kg` : ""} · atualizado {formatAge(offer.lastSuccessAt)} · origem: {offer.dataOrigin}
            </span>
          </span>
        }
        actions={
          <form action={checkNowAction}>
            <input type="hidden" name="ids" value={id} />
            <input type="hidden" name="voltar" value={`/admin/ofertas/${id}`} />
            <button className={btn.secondary} type="submit">
              Verificar agora
            </button>
          </form>
        }
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />
      {integration && !offer.demo && integration.status !== "configurada" && (
        <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
          Integração de {store?.name}: <strong>{integration.status === "somente_manual" ? "somente manual" : "pendente de configuração"}</strong>. “Verificar agora”
          registra a tentativa, mas não consulta a loja; atualize os campos manualmente.
        </p>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          <Section id="campos" title="Dados do anúncio" description="Corrigir o preço conta como atualização. Trave para que a próxima consulta não substitua.">
            <div className="divide-y">
              {OFFER_FIELDS.map((f) => (
                <FieldEditor
                  key={f.key}
                  id={`campo-${f.key}`}
                  label={f.label}
                  field={offer.fields[f.key] as never}
                  spec={f.spec}
                  format={(v) =>
                    f.key === "price" ? brl(Number(v)) : f.key === "availability" ? AVAILABILITY_LABEL[v as keyof typeof AVAILABILITY_LABEL] : f.key === "url" || f.key === "affiliateUrl" ? (
                      <a href={String(v)} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline underline-offset-4">
                        {String(v)}
                      </a>
                    ) : (
                      String(v)
                    )
                  }
                  editAction={editOfferFieldAction}
                  commandAction={offerFieldCommandAction}
                  hidden={{ id, campo: f.key, voltar: `/admin/ofertas/${id}#campo-${f.key}` }}
                  showVerification={false}
                />
              ))}
            </div>
          </Section>

          <Section id="historico" title="Histórico da oferta">
            <HistoryList events={history} />
          </Section>
        </div>

        <aside className="space-y-8">
          <Section id="situacao" title="Situação">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Identificador</dt>
              <dd className="break-all">{offer.externalId}</dd>
              <dt className="text-muted-foreground">Última consulta</dt>
              <dd>{formatDateTime(offer.lastCheckedAt)}</dd>
              <dt className="text-muted-foreground">Último sucesso</dt>
              <dd>{formatDateTime(offer.lastSuccessAt)}</dd>
              <dt className="text-muted-foreground">Falhas seguidas</dt>
              <dd>
                {offer.consecutiveFailures}
                {offer.lastError && <span className="block text-xs text-red-700 dark:text-red-400">{offer.lastError}</span>}
              </dd>
              <dt className="text-muted-foreground">Link de afiliado</dt>
              <dd>{offer.linkStatus.replace("_", " ")}</dd>
            </dl>
          </Section>

          <Section id="visibilidade" title="Visibilidade">
            <form action={hideOfferAction} className="space-y-2">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="ocultar" value={offer.hidden ? "0" : "1"} />
              {!offer.hidden && <input name="motivo" required placeholder="Motivo para ocultar" className={input} />}
              <button className={offer.hidden ? btn.secondary : btn.danger} type="submit">
                {offer.hidden ? "Mostrar oferta novamente" : "Ocultar oferta"}
              </button>
            </form>
          </Section>

          <Section id="comissao" title="Comissão">
            <form action={eligibilityAction} className="flex gap-2">
              <input type="hidden" name="id" value={id} />
              <select name="elegibilidade" defaultValue={offer.commissionEligibility} className={input} aria-label="Elegibilidade para comissão">
                <option value="nao_confirmada">Não confirmada</option>
                <option value="confirmada">Confirmada no programa</option>
                <option value="sem_programa">Loja sem programa</option>
              </select>
              <button className={btn.secondary} type="submit">
                Salvar
              </button>
            </form>
            <p className="mt-1 text-xs text-muted-foreground">Programa: {store?.affiliateProgram ?? "nenhum conhecido"}.</p>
          </Section>

          <Section id="vinculo" title="Produto vinculado">
            {product && (
              <p className="text-sm">
                <Link href={`/admin/produtos/${product.id}`} className="font-medium underline underline-offset-4">
                  {productLabel(product)}
                </Link>
              </p>
            )}
            <form action="" method="get" className="mt-2 flex gap-2">
              <select name="destino" defaultValue={target?.id ?? ""} className={input} aria-label="Trocar para o produto">
                <option value="">Trocar para…</option>
                {db.products
                  .filter((p) => p.id !== offer.productId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {productLabel(p)}
                    </option>
                  ))}
              </select>
              <button className={btn.secondary} type="submit">
                Comparar
              </button>
            </form>
            {target && product && (
              <form action={relinkOfferAction} className="mt-3 space-y-2 rounded-md border border-amber-300 p-2.5 dark:border-amber-800">
                <p className="text-sm font-medium">Diferenças antes de trocar</p>
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 text-left font-medium">Campo</th>
                      <th className="py-1 text-left font-medium">Atual</th>
                      <th className="py-1 text-left font-medium">Novo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIFF_KEYS.map((k) => {
                      const a = diffValue(product, k);
                      const b = diffValue(target, k);
                      return (
                        <tr key={k} className={a !== b ? "bg-amber-50 font-medium dark:bg-amber-950" : ""}>
                          <td className="py-1 pr-2">{FIELD_LABEL[k]}</td>
                          <td className="py-1 pr-2">{a}</td>
                          <td className="py-1">{b}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="productId" value={target.id} />
                <label className="flex items-start gap-1.5 text-xs">
                  <input type="checkbox" name="confirmo" className="mt-0.5 accent-foreground" /> Conferi: o anúncio é desta outra embalagem.
                </label>
                <button className={btn.primary} type="submit">
                  Trocar produto vinculado
                </button>
              </form>
            )}
          </Section>

          {alerts.length > 0 && (
            <Section id="alertas" title="Alertas abertos">
              <ul className="space-y-2 text-sm">
                {alerts.map((a) => (
                  <li key={a.id} className="flex gap-2">
                    <SeverityBadge severity={a.severity} />
                    <Link href={`/admin/revisao#alerta-${a.id}`} className="hover:underline">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}
