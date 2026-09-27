import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FieldEditor, type InputSpec } from "@/components/admin/field-editor";
import { HistoryList } from "@/components/admin/history-list";
import { PublicPreview } from "@/components/admin/public-preview";
import { brl, btn, DemoBadge, EmptyState, Flash, formatAge, input, PageHeader, Section, SeverityBadge, StatusBadge, Tag } from "@/components/admin/ui";
import { productLabel } from "@/lib/admin/alerts";
import { requireAdmin } from "@/lib/admin/auth";
import {
  AVAILABILITY_LABEL,
  FIELD_LABEL,
  FOOD_TYPE_LABEL,
  LIFE_STAGE_LABEL,
  SENSITIVE_PRODUCT_FIELDS,
  SIZE_LABEL,
  SPECIES_LABEL,
  formatGrams,
} from "@/lib/admin/labels";
import { missingForPublish } from "@/lib/admin/mutations";
import { toComparatorItem } from "@/lib/admin/preview";
import { adminRepo } from "@/lib/admin/repository";
import type { ProductFieldKey } from "@/lib/admin/types";

import {
  createOfferAction,
  editProductFieldAction,
  productFieldCommandAction,
  productMetaAction,
  setStatusAction,
  simulateImportAction,
} from "../../../actions";

export const metadata: Metadata = { title: "Ficha do produto" };

const opts = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }));

const SPECS: Record<ProductFieldKey, InputSpec> = {
  brand: { kind: "text" },
  line: { kind: "text" },
  formula: { kind: "text", placeholder: "Ex.: Cães Adultos Raças Médias" },
  species: { kind: "select", options: opts(SPECIES_LABEL) },
  lifeStage: { kind: "select", options: opts(LIFE_STAGE_LABEL) },
  size: { kind: "select", options: opts(SIZE_LABEL) },
  flavor: { kind: "text" },
  weightGrams: { kind: "number", suffix: "g" },
  foodType: { kind: "select", options: opts(FOOD_TYPE_LABEL) },
  gtin: { kind: "text", placeholder: "8, 12, 13 ou 14 dígitos" },
  manufacturerSku: { kind: "text" },
  vetIndication: { kind: "text" },
  kibbleSize: { kind: "text", placeholder: "Ex.: pequeno, 8 mm" },
  description: { kind: "textarea" },
  imageUrl: { kind: "url" },
};

const GROUPS: { title: string; keys: ProductFieldKey[] }[] = [
  { title: "Identidade da embalagem", keys: ["brand", "line", "formula", "flavor", "weightGrams"] },
  { title: "Para quem", keys: ["species", "lifeStage", "size", "foodType", "vetIndication"] },
  { title: "Códigos e detalhes", keys: ["gtin", "manufacturerSku", "kibbleSize", "description", "imageUrl"] },
];

function formatter(key: ProductFieldKey) {
  return function formatValue(v: string | number) {
    if (key === "weightGrams") return formatGrams(Number(v));
    if (key === "species") return SPECIES_LABEL[v as keyof typeof SPECIES_LABEL] ?? v;
    if (key === "lifeStage") return LIFE_STAGE_LABEL[v as keyof typeof LIFE_STAGE_LABEL] ?? v;
    if (key === "size") return SIZE_LABEL[v as keyof typeof SIZE_LABEL] ?? v;
    if (key === "foodType") return FOOD_TYPE_LABEL[v as keyof typeof FOOD_TYPE_LABEL] ?? v;
    if (key === "imageUrl")
      return (
        <a href={String(v)} className="break-all underline underline-offset-4" target="_blank" rel="noopener noreferrer">
          {String(v)}
        </a>
      );
    return String(v);
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/admin/produtos/[id]">) {
  await requireAdmin();
  const [{ id }, sp, db] = await Promise.all([params, searchParams, adminRepo.read()]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const product = db.products.find((p) => p.id === id);
  if (!product) notFound();

  const f = product.fields;
  const offers = db.offers.filter((o) => o.productId === id);
  const storeById = new Map(db.stores.map((s) => [s.id, s]));
  const alerts = db.alerts.filter((a) => a.productId === id && a.status === "aberto");
  const history = db.history
    .filter((h) => h.productId === id)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 60);
  const missing = missingForPublish(product);
  const item = toComparatorItem(db, product);
  const label = productLabel(product) || "Ficha sem nome";
  const weight = f.weightGrams.value;
  const statusForm = (estado: string, text: string, className = btn.secondary) => (
    <form action={setStatusAction}>
      <input type="hidden" name="ids" value={id} />
      <input type="hidden" name="estado" value={estado} />
      <input type="hidden" name="voltar" value={`/admin/produtos/${id}`} />
      <button className={className} type="submit">
        {text}
      </button>
    </form>
  );

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted-foreground">
        <Link href="/admin/produtos" className="hover:text-foreground hover:underline">
          Produtos
        </Link>{" "}
        / <span className="text-foreground">{id}</span>
      </nav>
      <PageHeader
        title={label}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={product.status} /> Atualizada {formatAge(product.updatedAt)} ·{" "}
            {alerts.length ? (
              <Link href={`/admin/revisao?produto=${id}`} className="underline underline-offset-4">
                {alerts.length} alerta(s) aberto(s)
              </Link>
            ) : (
              "sem alertas abertos"
            )}
          </span>
        }
        actions={
          <>
            {product.status !== "publicado" && statusForm("publicado", "Publicar", btn.primary)}
            {product.status !== "rascunho" && statusForm("rascunho", "Voltar a rascunho")}
            {product.status !== "oculto" && statusForm("oculto", "Ocultar")}
          </>
        }
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />
      {missing.length > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          Para publicar, preencha: {missing.join(", ")}.
        </p>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          <Section
            id="campos"
            title="Dados da ficha"
            description="Cada campo mostra o valor exibido, a origem e a correção manual. Corrigir trava o campo por padrão."
            actions={
              db.settings.demoMode && (
                <form action={simulateImportAction}>
                  <input type="hidden" name="id" value={id} />
                  <button className={btn.ghost} type="submit">
                    Simular importação (demonstração)
                  </button>
                </form>
              )
            }
          >
            <div className="space-y-6">
              {GROUPS.map((g) => (
                <div key={g.title}>
                  <h3 className="border-b pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.title}</h3>
                  <div className="divide-y">
                    {g.keys.map((key) => (
                      <FieldEditor
                        key={key}
                        id={`campo-${key}`}
                        label={FIELD_LABEL[key]}
                        field={f[key] as never}
                        spec={SPECS[key]}
                        format={formatter(key)}
                        editAction={editProductFieldAction}
                        commandAction={productFieldCommandAction}
                        hidden={{ id, campo: key }}
                        allowVerify
                        sensitive={SENSITIVE_PRODUCT_FIELDS.includes(key)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="ofertas"
            title={`Ofertas vinculadas (${offers.length})`}
            description="Anúncios desta embalagem exata em cada loja."
          >
            {offers.length ? (
              <div className="relative overflow-x-auto rounded-md border">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Loja</th>
                      <th className="px-3 py-2 font-medium">Preço</th>
                      <th className="px-3 py-2 font-medium">R$/kg</th>
                      <th className="px-3 py-2 font-medium">Situação</th>
                      <th className="px-3 py-2 font-medium">Atualização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {offers.map((o) => (
                      <tr key={o.id}>
                        <td className="px-3 py-2">
                          <Link href={`/admin/ofertas/${o.id}`} className="font-medium hover:underline">
                            {storeById.get(o.storeId)?.name ?? o.storeId}
                          </Link>{" "}
                          {o.demo && <DemoBadge />}
                          <p className="text-xs text-muted-foreground">{o.fields.sellerName.value ?? "vendedor não informado"}</p>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{brl(o.fields.price.value)}</td>
                        <td className="px-3 py-2 tabular-nums">{o.fields.price.value && weight ? brl((o.fields.price.value / weight) * 1000) : "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          {o.hidden ? <Tag>Oculta</Tag> : o.fields.availability.value ? AVAILABILITY_LABEL[o.fields.availability.value] : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {formatAge(o.lastSuccessAt)}
                          {o.consecutiveFailures > 0 && <span className="block text-red-700 dark:text-red-400">{o.consecutiveFailures} falha(s)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="Nenhuma oferta vinculada.">O produto pode ficar no catálogo sem ofertas. Cadastre uma oferta quando tiver o anúncio da loja.</EmptyState>
            )}
            <details className="mt-3 rounded-md border [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium">+ Cadastrar oferta manualmente</summary>
              <form action={createOfferAction} className="grid gap-3 border-t p-3 sm:grid-cols-2">
                <input type="hidden" name="productId" value={id} />
                <label className="space-y-1 text-xs">
                  <span className="font-medium">Loja</span>
                  <select name="storeId" required className={input}>
                    {db.stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-medium">Identificador na loja (ASIN, MLB, SKU…)</span>
                  <input name="externalId" required className={input} />
                </label>
                <label className="space-y-1 text-xs sm:col-span-2">
                  <span className="font-medium">URL original do anúncio</span>
                  <input name="url" type="url" placeholder="https://" className={input} />
                </label>
                <label className="space-y-1 text-xs sm:col-span-2">
                  <span className="font-medium">Título do anúncio (para conferir marca, sabor e peso)</span>
                  <input name="listingTitle" className={input} />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-medium">Preço (R$)</span>
                  <input name="price" inputMode="decimal" placeholder="189,90" className={input} />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-medium">Disponibilidade</span>
                  <select name="availability" className={input} defaultValue="disponivel">
                    {opts(AVAILABILITY_LABEL).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-medium">Vendedor</span>
                  <input name="sellerName" className={input} />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-medium">Comissão</span>
                  <select name="eligibility" className={input} defaultValue="nao_confirmada">
                    <option value="nao_confirmada">Não confirmada</option>
                    <option value="confirmada">Confirmada no programa</option>
                    <option value="sem_programa">Loja sem programa</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs sm:col-span-2">
                  <span className="font-medium">Link de afiliado (gerado no painel do programa)</span>
                  <input name="affiliateUrl" type="url" placeholder="https://" className={input} />
                </label>
                <div className="sm:col-span-2">
                  <button className={btn.primary} type="submit">
                    Salvar oferta
                  </button>
                </div>
              </form>
            </details>
          </Section>

          <Section id="historico" title="Histórico" description="Edições, importações, preços e verificações desta ficha e das suas ofertas.">
            <HistoryList events={history} labelFor={(e) => (e.offerId ? `Oferta: ${storeById.get(offers.find((o) => o.id === e.offerId)?.storeId ?? "")?.name ?? e.offerId}` : null)} />
          </Section>
        </div>

        <aside className="space-y-8">
          <Section id="imagem" title="Imagem da embalagem">
            {f.imageUrl.value ? (
              <figure className="rounded-md border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL informada pelo admin, pode ser de qualquer domínio */}
                <img src={f.imageUrl.value} alt={`Embalagem de ${label}`} className="mx-auto h-48 object-contain" />
                <figcaption className="mt-1 text-xs text-muted-foreground">Situação: {product.imageStatus.replace("_", " ")}</figcaption>
              </figure>
            ) : (
              <EmptyState title="Sem foto oficial.">
                Use apenas foto do fabricante ou com autorização. Cadastre a URL no campo “Imagem da embalagem”.
              </EmptyState>
            )}
          </Section>

          <Section id="previa" title="Prévia no site público" description="Só ofertas reais, visíveis e disponíveis entram no preço.">
            {weight ? (
              <PublicPreview item={item} />
            ) : (
              <EmptyState title="Sem prévia.">Preencha o peso para ver como o cartão aparecerá.</EmptyState>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {product.status === "publicado" ? "Publicado: aparecerá no comparador quando o site ler este catálogo." : "Não aparece no site enquanto não for publicado."}
            </p>
          </Section>

          <Section id="fontes" title="Fontes e verificação">
            <ul className="space-y-3 text-sm">
              {product.sources.map((s) => (
                <li key={s.url} className="space-y-0.5">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="block break-all font-medium underline underline-offset-4">
                    {s.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 70)}
                    {s.url.length > 80 ? "…" : ""}
                  </a>
                  <p className="text-xs">
                    <Tag>{s.kind === "fabricante" ? "Fabricante" : "Loja"}</Tag> {s.evidence}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.checkedHow}</p>
                </li>
              ))}
              {!product.sources.length && <li className="text-muted-foreground">Nenhuma fonte cadastrada.</li>}
            </ul>
            {product.verificationNote && (
              <p className="mt-3 rounded-md border bg-muted/50 p-2.5 text-xs">
                <span className="font-semibold">Nota:</span> {product.verificationNote}
              </p>
            )}
            <details className="mt-3 [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer list-none text-xs font-medium underline underline-offset-4">Adicionar fonte ou editar nota</summary>
              <form action={productMetaAction} className="mt-2 space-y-2">
                <input type="hidden" name="id" value={id} />
                <input name="fonteUrl" type="url" placeholder="URL que comprova nome, fórmula e peso" className={input} />
                <input name="fonteEvidencia" placeholder="O que a fonte comprova" className={input} />
                <textarea name="nota" defaultValue={product.verificationNote} rows={3} className={input + " h-auto py-1.5"} />
                <button className={btn.secondary} type="submit">
                  Salvar
                </button>
              </form>
            </details>
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
