import { deleteOfferAction, saveOfferAction } from "@/app/admin/actions";
import { StoreLogo } from "@/components/icons/store-logo";
import { ADMIN_STORES, storeInfo } from "@/config/stores";
import type { AdminOffer, AdminProduct } from "@/lib/admin/types";

import { brl, btn, formatDateTime, input } from "./ui";

function OfferFields({ offer, stores }: { offer?: AdminOffer; stores: typeof ADMIN_STORES }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[10rem_7rem_1fr]">
      <label className="space-y-1 text-xs">
        <span className="font-medium">Loja</span>
        <select name="loja" defaultValue={offer?.store ?? stores[0]?.slug} className={input} required>
          {stores.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-xs">
        <span className="font-medium">Preço (R$)</span>
        <input name="preco" inputMode="decimal" defaultValue={offer?.price != null ? String(offer.price).replace(".", ",") : ""} placeholder="189,90" className={input} />
      </label>
      <label className="space-y-1 text-xs">
        <span className="font-medium">Link de afiliado (ou link da loja)</span>
        <input name="link" type="url" defaultValue={offer?.url ?? ""} placeholder="https://" className={input} />
      </label>
      <label className="space-y-1 text-xs sm:col-span-2">
        <span className="font-medium">Vendedor (marketplaces)</span>
        <input name="vendedor" defaultValue={offer?.sellerName ?? ""} className={input} />
      </label>
      <label className="flex items-end gap-2 pb-1.5 text-sm">
        <input type="checkbox" name="disponivel" defaultChecked={offer?.available ?? true} className="size-4 accent-foreground" /> Disponível
      </label>
    </div>
  );
}

/**
 * Preços por loja, cadastrados à mão. O link fica só no servidor: o site
 * mostra o botão "Ir à loja", que passa por /ir/<id> (conta o clique).
 */
export function OffersEditor({ product }: { product: AdminProduct }) {
  const used = new Set(product.offers.map((o) => o.store));
  const free = ADMIN_STORES.filter((s) => !used.has(s.slug));
  return (
    <section id="precos" aria-labelledby="precos-titulo" className="scroll-mt-20 rounded-lg border">
      <div className="border-b px-4 py-3">
        <h2 id="precos-titulo" className="font-display text-sm font-semibold">
          Preços nas lojas
        </h2>
        <p className="text-xs text-muted-foreground">
          Sem integração automática: cadastre o preço e o link de cada loja. Ao mudar o preço, o anterior fica no histórico (média de 30 dias).
        </p>
      </div>
      {product.offers.length ? (
        <ul className="divide-y">
          {product.offers.map((o) => {
            const host = o.url ? new URL(o.url).hostname.replace(/^www\./, "") : null;
            return (
              <li key={o.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex min-w-40 items-center gap-2 font-medium">
                    <StoreLogo slug={o.store} size={24} /> {storeInfo(o.store).name}
                  </span>
                  <span className="font-display font-semibold tabular-nums">{o.price != null ? brl(o.price) : <span className="text-xs text-amber-800 dark:text-amber-300">Sem preço</span>}</span>
                  <span className={"text-xs " + (o.available ? "text-emerald-800 dark:text-emerald-300" : "text-muted-foreground")}>{o.available ? "Disponível" : "Indisponível"}</span>
                  <span className="text-xs text-muted-foreground">{host ? `Link: ${host}` : <span className="text-amber-800 dark:text-amber-300">Sem link</span>}</span>
                  <span className="ml-auto text-xs text-muted-foreground">Atualizado {formatDateTime(o.updatedAt)}</span>
                </div>
                <details className="mt-1 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="inline-flex cursor-pointer list-none text-xs font-medium underline underline-offset-4">Editar</summary>
                  <div className="mt-2 space-y-2 rounded-md border p-3">
                    <form action={saveOfferAction} className="space-y-2">
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="offerId" value={o.id} />
                      <OfferFields offer={o} stores={ADMIN_STORES.filter((s) => s.slug === o.store || !used.has(s.slug))} />
                      <button type="submit" className={btn.primary}>
                        Salvar preço
                      </button>
                    </form>
                    <form action={deleteOfferAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="offerId" value={o.id} />
                      <button type="submit" className={btn.ghost}>
                        Remover esta loja
                      </button>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-muted-foreground">Nenhuma loja cadastrada. Sem preço, a ração aparece no site como “Sem ofertas ativas”.</p>
      )}
      {free.length > 0 && (
        <form action={saveOfferAction} className="space-y-2 border-t bg-muted/30 px-4 py-3">
          <input type="hidden" name="productId" value={product.id} />
          <p className="text-xs font-semibold">Adicionar loja</p>
          <OfferFields stores={free} />
          <button type="submit" className={btn.secondary}>
            Adicionar
          </button>
        </form>
      )}
    </section>
  );
}
