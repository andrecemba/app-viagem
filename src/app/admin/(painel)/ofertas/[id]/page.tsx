import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { refreshOfferAction, revertOverrideAction, setMatchAction, setOfferActiveAction, setOfferSourceAction, updateOfferAction } from "@/app/admin/actions";
import { brl, btn, DemoBadge, Flash, formatDateTime, input, Tag } from "@/components/admin/ui";
import { StoreLogo } from "@/components/icons/store-logo";
import { requireAdmin } from "@/lib/admin/auth";
import { formatGrams } from "@/lib/catalog/vocab";
import { getDb } from "@/lib/db";
import { ALERT_LABEL, offerAlerts } from "@/lib/domain/alerts";
import { FIELD_LABELS, getOffer, listEvents } from "@/lib/domain/offers";
import { getProduct, productName } from "@/lib/domain/products";
import { getSettings } from "@/lib/domain/settings";
import { getStore } from "@/lib/domain/stores";
import type { Offer, OfferValues, OverridableField } from "@/lib/domain/types";
import { sourceForStore } from "@/lib/integrations";

export const metadata: Metadata = { title: "Oferta" };

const EVENT_LABEL: Record<string, string> = {
  criacao: "Cadastro",
  edicao: "Edição",
  sincronizacao: "Atualização automática",
  erro: "Erro na consulta",
  correcao: "Correção manual",
  volta_automatico: "Volta ao automático",
  importacao: "Importação",
  confirmacao: "Conferência",
};

function show(field: OverridableField, v: OfferValues[OverridableField] | undefined) {
  if (v == null || v === "") return "vazio";
  if (field === "price" || field === "previousPrice") return brl(v as number);
  if (field === "listingWeightGrams") return formatGrams(v as number);
  if (field === "freeShipping") return v ? "sim" : "não";
  if (field === "availability") return v === "disponivel" ? "disponível" : v === "indisponivel" ? "indisponível" : "não informado";
  return String(v);
}

/** Linha de correção: mostra quem corrigiu, o valor automático e o botão para voltar a ele. */
function OverrideNote({ offer, field }: { offer: Offer; field: OverridableField }) {
  const o = offer.overrides[field];
  if (!o) return offer.dataSource !== "manual" ? <span className="block text-[0.6875rem] text-muted-foreground">Valor automático</span> : null;
  return (
    <span className="mt-1 block rounded bg-amber-50 px-2 py-1 text-[0.6875rem] text-amber-950 dark:bg-amber-950 dark:text-amber-100">
      Correção manual de {o.createdBy.replace(/^admin:/, "")} em {formatDateTime(o.createdAt)}
      {o.note && ` (“${o.note}”)`}. Valor automático: <strong>{show(field, offer.auto[field])}</strong>.{" "}
      <button type="submit" formAction={revertOverrideAction.bind(null, field)} formNoValidate className="font-semibold underline underline-offset-2">
        Voltar ao valor automático
      </button>
    </span>
  );
}

export default async function OfferPage({ params, searchParams }: PageProps<"/admin/ofertas/[id]">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const db = getDb();
  const offer = getOffer(db, Number(id));
  if (!offer) notFound();
  const product = getProduct(db, offer.productId)!;
  const store = getStore(db, offer.storeId)!;
  const alerts = offerAlerts(offer, product, store, getSettings(db));
  const events = listEvents(db, offer.id, 40);
  const src = sourceForStore(store, db);
  const canRefresh = offer.dataSource === "api" && store.mode === "api" && src.status().state === "ativa" && Boolean(offer.externalId);
  const imported = offer.dataSource !== "manual";
  const kgValue = (g: number | null) => (g == null ? "" : String(g / 1000).replace(".", ","));

  return (
    <div className="space-y-4">
      <div className="border-b pb-4">
        <Link href={`/admin/produtos/${product.id}`} className="text-xs text-muted-foreground hover:text-foreground">
          ← {productName(product)}
        </Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 font-display text-xl font-semibold">
          <StoreLogo name={store.name} color={store.color} logo={store.logoUrl} size={28} /> Oferta {store.name}
          <span className="text-muted-foreground tabular-nums">{offer.price != null ? brl(offer.price) : ""}</span>
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Tag>{offer.dataSource === "manual" ? "Cadastro manual" : offer.dataSource === "api" ? `API (${src.label})` : "Arquivo / feed"}</Tag>
          {offer.matchStatus === "incerta" ? <Tag tone="bad">Correspondência incerta</Tag> : <Tag tone="good">Correspondência confirmada</Tag>}
          {!offer.active && <Tag>Desativada</Tag>}
          {offer.isDemo && <DemoBadge />}
          ID {offer.externalId ?? "—"} · preço de {formatDateTime(offer.priceObtainedAt)} ({offer.priceSource ?? "—"}) · última consulta {formatDateTime(offer.lastCheckedAt)}
        </p>
      </div>
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      {alerts.length > 0 && (
        <ul className="space-y-1.5">
          {alerts.map((a) => (
            <li key={a.kind} className="flex flex-wrap items-baseline gap-2 rounded-md border px-3 py-2 text-sm">
              <Tag tone={a.kind === "produto_incerto" || a.kind.startsWith("divergencia") || a.kind === "erro_importacao" ? "bad" : "warn"}>{ALERT_LABEL[a.kind]}</Tag>
              <span className="text-muted-foreground">{a.detail}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {canRefresh ? (
          <form action={refreshOfferAction}>
            <input type="hidden" name="id" value={offer.id} />
            <button type="submit" className={btn.secondary}>
              Atualizar agora pela API
            </button>
          </form>
        ) : offer.dataSource === "manual" && store.mode === "api" && src.fetchListing ? (
          <form action={setOfferSourceAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={offer.id} />
            <input type="hidden" name="origem" value="api" />
            <button type="submit" disabled={src.status().state !== "ativa" || !offer.externalId} className={btn.primary}>
              Atualizar automaticamente pela API
            </button>
            <span className="text-xs text-muted-foreground">
              {!offer.externalId
                ? "Informe o ID do anúncio para ligar."
                : src.status().state !== "ativa"
                  ? `API do ${store.name} não conectada (npm run ml:conectar).`
                  : "Preço, disponibilidade e frete grátis passam a vir do anúncio oficial."}
            </span>
          </form>
        ) : (
          <span className="inline-flex h-8 items-center text-xs text-muted-foreground">
            {offer.dataSource === "api" ? `Atualização pela API indisponível: ${src.status().note}` : "Sem integração ativa: atualize o preço no formulário."}
          </span>
        )}
        {offer.dataSource === "api" && (
          <form action={setOfferSourceAction}>
            <input type="hidden" name="id" value={offer.id} />
            <input type="hidden" name="origem" value="manual" />
            <button type="submit" className={btn.ghost}>
              Voltar para cadastro manual
            </button>
          </form>
        )}
        <form action={setMatchAction}>
          <input type="hidden" name="id" value={offer.id} />
          <input type="hidden" name="status" value={offer.matchStatus === "incerta" ? "confirmada" : "incerta"} />
          <button type="submit" className={offer.matchStatus === "incerta" ? btn.primary : btn.ghost}>
            {offer.matchStatus === "incerta" ? "Confirmar: é a mesma ração" : "Marcar para revisão"}
          </button>
        </form>
        <form action={setOfferActiveAction}>
          <input type="hidden" name="id" value={offer.id} />
          <input type="hidden" name="ativo" value={offer.active ? "0" : "1"} />
          <button type="submit" className={btn.ghost}>
            {offer.active ? "Desativar oferta" : "Reativar oferta"}
          </button>
        </form>
        <Link href={`/admin/produtos/${product.id}/nova-oferta?de=${offer.id}`} className={btn.ghost}>
          Duplicar para outra loja
        </Link>
        {offer.active && product.active && (
          <Link href={`/produto/${product.slug}#lojas`} target="_blank" className={btn.ghost}>
            Ver no site
          </Link>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <form action={updateOfferAction} className="space-y-4 rounded-lg border p-4">
          <input type="hidden" name="id" value={offer.id} />
          <p className="text-sm">
            {imported ? (
              <>
                <strong>Oferta importada.</strong> Ao mudar um campo, ele vira uma correção manual: a próxima atualização não apaga. Para voltar a usar o dado da loja,
                clique em “Voltar ao valor automático”.
              </>
            ) : (
              <strong>Oferta manual: os valores abaixo são os publicados.</strong>
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs">
              <span className="font-medium">Preço (R$)</span>
              <input name="preco" inputMode="decimal" defaultValue={offer.price != null ? String(offer.price).replace(".", ",") : ""} className={input} />
              <OverrideNote offer={offer} field="price" />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium">Disponibilidade</span>
              <select name="disponibilidade" defaultValue={offer.availability} className={input}>
                <option value="disponivel">Disponível</option>
                <option value="indisponivel">Indisponível</option>
                <option value="desconhecida">Não informado</option>
              </select>
              <OverrideNote offer={offer} field="availability" />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium">Preço anterior (R$)</span>
              <input name="precoAnterior" inputMode="decimal" defaultValue={offer.previousPrice != null ? String(offer.previousPrice).replace(".", ",") : ""} className={input} />
              <span className="block text-[0.6875rem] text-muted-foreground">Só com comprovação: o site mostra “antes” quando houver data e for maior que o atual.</span>
              <OverrideNote offer={offer} field="previousPrice" />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium">Data do preço anterior</span>
              <input name="precoAnteriorData" type="date" defaultValue={offer.previousPriceAt?.slice(0, 10) ?? ""} className={input} />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium">Peso no anúncio (kg)</span>
              <input name="pesoAnuncio" inputMode="decimal" defaultValue={kgValue(offer.listingWeightGrams)} className={input} />
              <input type="hidden" name="pesoAnuncioUnidade" value="kg" />
              <span className="block text-[0.6875rem] text-muted-foreground">Produto: {formatGrams(product.weightGrams)}</span>
              <OverrideNote offer={offer} field="listingWeightGrams" />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium">Sabor no anúncio</span>
              <input name="saborAnuncio" defaultValue={offer.listingFlavor ?? ""} className={input} />
              <span className="block text-[0.6875rem] text-muted-foreground">Produto: {product.flavor ?? "não informado"}</span>
              <OverrideNote offer={offer} field="listingFlavor" />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium">Selo de frete grátis no anúncio</span>
              <select name="freteGratis" defaultValue={offer.freeShipping == null ? "" : offer.freeShipping ? "sim" : "nao"} className={input}>
                <option value="">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
              <OverrideNote offer={offer} field="freeShipping" />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium">ID do anúncio</span>
              <input name="idAnuncio" defaultValue={offer.externalId ?? ""} className={input} />
            </label>
            <label className="block space-y-1 text-xs sm:col-span-2">
              <span className="font-medium">URL original</span>
              <input name="url" type="url" required defaultValue={offer.url} className={input} />
              <OverrideNote offer={offer} field="url" />
            </label>
            <label className="block space-y-1 text-xs sm:col-span-2">
              <span className="font-medium">Link de afiliado</span>
              <input name="afiliado" type="url" defaultValue={offer.affiliateUrl ?? ""} placeholder="https://" className={input} />
              <span className="block text-[0.6875rem] text-muted-foreground">
                Aceito: domínios de {store.name} ({[...store.domains, ...store.affiliateDomains].join(", ")}). Nunca é montado a partir da URL.
              </span>
              <OverrideNote offer={offer} field="affiliateUrl" />
            </label>
            <label className="block space-y-1 text-xs sm:col-span-2">
              <span className="font-medium">Imagem do anúncio (https)</span>
              <input name="imagem" type="url" defaultValue={offer.imageUrl ?? ""} className={input} />
              <OverrideNote offer={offer} field="imageUrl" />
            </label>
            <label className="block space-y-1 text-xs sm:col-span-2">
              <span className="font-medium">Observações</span>
              <textarea name="observacoes" rows={2} defaultValue={offer.notes ?? ""} className={input + " h-auto py-1.5"} />
              <OverrideNote offer={offer} field="notes" />
            </label>
            {imported && (
              <label className="block space-y-1 text-xs sm:col-span-2">
                <span className="font-medium">Motivo da correção (fica registrado)</span>
                <input name="nota" placeholder="Ex.: conferido no site da loja em 28/09" className={input} />
              </label>
            )}
          </div>
          <button type="submit" className={btn.primary + " h-9 px-4"}>
            Salvar
          </button>
        </form>

        <section aria-labelledby="historico" className="space-y-2">
          <h2 id="historico" className="font-display text-sm font-semibold">
            Histórico
          </h2>
          <ol className="divide-y rounded-lg border text-xs">
            {events.map((e) => (
              <li key={e.id} className="px-3 py-2">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={e.kind === "erro" ? "font-semibold text-red-700 dark:text-red-400" : "font-semibold"}>{EVENT_LABEL[e.kind] ?? e.kind}</span>
                  <span className="text-muted-foreground">{formatDateTime(e.at)}</span>
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {e.price != null && <span className="font-medium text-foreground">{brl(e.price)} · </span>}
                  {e.message} <span className="whitespace-nowrap">({e.actor.replace(/^admin:/, "")})</span>
                </p>
              </li>
            ))}
            {!events.length && <li className="px-3 py-4 text-muted-foreground">Sem registros.</li>}
          </ol>
          <p className="text-[0.6875rem] text-muted-foreground">Campos corrigidos: {Object.keys(offer.overrides).map((f) => FIELD_LABELS[f as OverridableField]).join(", ") || "nenhum"}.</p>
        </section>
      </div>
    </div>
  );
}
