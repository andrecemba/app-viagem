import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createOfferAction } from "@/app/admin/actions";
import { btn, Flash, input, Tag } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { formatGrams } from "@/lib/catalog/vocab";
import { getDb } from "@/lib/db";
import { getProduct, productName } from "@/lib/domain/products";
import { listStores } from "@/lib/domain/stores";
import { divergence, hostOf, storeForUrl } from "@/lib/domain/validation";
import { logIntegrationError } from "@/lib/integrations/http";
import { sourceForStore } from "@/lib/integrations";
import { ERROR_LABEL, IntegrationError, type NormalizedListing } from "@/lib/integrations/types";

export const metadata: Metadata = { title: "Nova oferta" };

function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block space-y-1 text-xs ${className ?? ""}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-[0.6875rem] text-muted-foreground">{hint}</span>}
    </label>
  );
}

/**
 * Nova oferta em dois passos: 1) colar a URL do anúncio; 2) revisar os campos
 * (loja detectada pelo domínio, ID extraído quando o formato permite, dados da
 * API quando a integração está ativa) e confirmar peso e sabor.
 */
export default async function NewOfferPage({ params, searchParams }: PageProps<"/admin/produtos/[id]/nova-oferta">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const db = getDb();
  const product = getProduct(db, Number(id));
  if (!product) notFound();
  const stores = listStores(db, { onlyActive: true });
  const url = one(sp.url)?.trim() ?? "";
  const validUrl = url && hostOf(url) ? url : null;
  const detected = validUrl ? storeForUrl(stores, validUrl) : null;
  const store = stores.find((s) => s.id === one(sp.loja)) ?? detected;
  const src = store ? sourceForStore(store, db) : null;
  const parsed = validUrl && src ? src.parseListingUrl(validUrl) : null;
  const canFetch = Boolean(src?.fetchListing && src.status().state === "ativa" && src.capabilities().refreshPrice && store?.mode === "api");

  let listing: NormalizedListing | null = null;
  let fetchError: string | null = null;
  if (canFetch && one(sp.buscar) === "1" && parsed?.externalId) {
    try {
      listing = await src!.fetchListing!(parsed.externalId, { url: validUrl });
    } catch (e) {
      logIntegrationError(src!.id, e);
      fetchError = e instanceof IntegrationError ? `${ERROR_LABEL[e.kind]}: ${e.message}` : "Falha ao consultar a loja.";
    }
  }
  const div = listing ? divergence(product.weightGrams, product.flavor, { listingWeightGrams: listing.listingWeightGrams, listingFlavor: listing.listingFlavor }) : null;
  const back = `/admin/produtos/${product.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="border-b pb-4">
        <Link href={back} className="text-xs text-muted-foreground hover:text-foreground">
          ← {productName(product)}
        </Link>
        <h1 className="mt-1 font-display text-xl font-semibold">Nova oferta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Produto: <strong className="text-foreground">{productName(product)}</strong> — {formatGrams(product.weightGrams)}
          {product.flavor ? `, sabor ${product.flavor}` : ""}
          {product.neutered ? ", castrados" : ""}.
        </p>
      </div>
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      <form action={`/admin/produtos/${product.id}/nova-oferta`} className="rounded-lg border p-4">
        <p className="text-sm font-semibold">1. Cole a URL do anúncio</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input name="url" type="url" required defaultValue={url} placeholder="https://www.loja.com.br/produto/..." className={input + " h-9"} />
          <button type="submit" className={btn.secondary + " h-9"}>
            Continuar
          </button>
        </div>
        {url && !validUrl && <p className="mt-2 text-sm text-destructive">Use um endereço https:// completo.</p>}
        {validUrl && !detected && (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            O domínio {hostOf(validUrl)} não é de nenhuma loja cadastrada. Escolha a loja abaixo (a URL será recusada se não for dela) ou cadastre a loja em Lojas.
          </p>
        )}
      </form>

      {validUrl && (
        <form action={createOfferAction} className="space-y-4 rounded-lg border p-4">
          <input type="hidden" name="productId" value={product.id} />
          <p className="text-sm font-semibold">2. Revise e confirme</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Loja">
              <select name="loja" defaultValue={store?.id ?? ""} required className={input}>
                <option value="" disabled>
                  Escolha…
                </option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Origem dos dados" hint={store ? `${store.name}: ${src?.status().note ?? ""}` : undefined}>
              <select name="origem" defaultValue={listing ? "api" : "manual"} className={input}>
                <option value="manual">Manual (preço digitado aqui)</option>
                {store?.mode === "api" && (
                  <option value="api" disabled={!canFetch}>
                    API da loja{canFetch ? "" : " (integração pendente)"}
                  </option>
                )}
                {store?.mode === "feed" && <option value="feed">Arquivo / feed autorizado</option>}
              </select>
            </Field>
            <Field label="URL original do anúncio" className="sm:col-span-2">
              <input name="url" type="url" required defaultValue={listing?.url ?? validUrl} className={input} />
            </Field>
            <Field label="ID do anúncio" hint={parsed?.externalId ? "Extraído da URL: confira." : (parsed?.hint ?? "Opcional para ofertas manuais.")}>
              <input name="idAnuncio" defaultValue={parsed?.externalId ?? ""} className={input} />
            </Field>
            <Field label="Título do anúncio" hint="Opcional: ajuda a conferir peso e sabor.">
              <input name="tituloAnuncio" defaultValue={listing?.title ?? ""} className={input} />
            </Field>
          </div>

          {canFetch && parsed?.externalId && !listing && (
            <p className="text-sm">
              <Link href={`?url=${encodeURIComponent(validUrl)}&loja=${store!.id}&buscar=1`} className={btn.secondary}>
                Buscar dados do anúncio pela API
              </Link>
            </p>
          )}
          {fetchError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">{fetchError}</p>}
          {listing && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
              Dados lidos da API agora. Revise antes de salvar.
              {div?.weight && <Tag tone="bad">Peso do anúncio diferente do produto</Tag>}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Preço (R$)">
              <input name="preco" inputMode="decimal" defaultValue={listing?.price != null ? String(listing.price).replace(".", ",") : ""} placeholder="189,90" className={input} />
            </Field>
            <Field label="Disponibilidade">
              <select name="disponibilidade" defaultValue={listing?.availability ?? "disponivel"} className={input}>
                <option value="disponivel">Disponível</option>
                <option value="indisponivel">Indisponível</option>
                <option value="desconhecida">Não informado</option>
              </select>
            </Field>
            <Field label="Selo de frete grátis no anúncio" hint="Indicação geral: não é cotação para o CEP.">
              <select name="freteGratis" defaultValue={listing?.freeShipping == null ? "" : listing.freeShipping ? "sim" : "nao"} className={input}>
                <option value="">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </Field>
            <Field label="Link de afiliado" className="sm:col-span-3" hint="Gerado no painel do programa de afiliados. Nunca é montado a partir da URL.">
              <input name="afiliado" type="url" defaultValue={listing?.affiliateUrl ?? ""} placeholder="https://" className={input} />
            </Field>
          </div>

          <fieldset className="rounded-md border bg-muted/30 p-3">
            <legend className="px-1 text-xs font-semibold">Conferência: é a mesma ração?</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Peso no anúncio">
                <div className="flex gap-2">
                  <input
                    name="pesoAnuncio"
                    inputMode="decimal"
                    defaultValue={listing?.listingWeightGrams ? String(listing.listingWeightGrams / 1000).replace(".", ",") : ""}
                    placeholder={String(product.weightGrams / 1000).replace(".", ",")}
                    className={input}
                  />
                  <select name="pesoAnuncioUnidade" defaultValue="kg" aria-label="Unidade" className={input + " w-16"}>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                  </select>
                </div>
              </Field>
              <Field label="Sabor no anúncio">
                <input name="saborAnuncio" defaultValue={listing?.listingFlavor ?? ""} placeholder={product.flavor ?? ""} className={input} />
              </Field>
              <label className="flex items-end gap-2 pb-1.5 text-sm">
                <input type="checkbox" name="confere" className="size-4 accent-foreground" /> Conferi: peso e sabor do anúncio são os do produto
              </label>
            </div>
            <p className="mt-2 text-[0.6875rem] text-muted-foreground">
              Se o peso ou o sabor informado for diferente do produto, a oferta é salva como “correspondência incerta” e aparece nos alertas.
            </p>
          </fieldset>

          <Field label="Observações">
            <input name="observacoes" className={input} />
          </Field>
          <button type="submit" className={btn.primary + " h-9 px-4"}>
            Salvar oferta
          </button>
        </form>
      )}
    </div>
  );
}
