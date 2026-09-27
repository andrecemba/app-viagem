import "server-only";

import type { ComparatorItem, ComparatorOffer } from "@/lib/comparator/types";

import { adminCatalog, adminOfferUrl } from "./admin-source";
import { mockSource } from "./mock-source";

/**
 * Catálogo do site público.
 *  - "exemplo" (padrão): dados ilustrativos de `src/data/mock`, sem links reais.
 *  - "admin": produtos PUBLICADOS no painel, com os preços e links cadastrados lá.
 * Troca por variável de ambiente: CATALOGO_PUBLICO=admin.
 */
export function catalogSource(): "admin" | "exemplo" {
  return process.env.CATALOGO_PUBLICO === "admin" ? "admin" : "exemplo";
}

export async function getCatalog(): Promise<ComparatorItem[]> {
  return catalogSource() === "admin" ? adminCatalog() : mockSource.getComparatorItems();
}

export async function getCatalogItem(slug: string) {
  const items = await getCatalog();
  const item = items.find((i) => i.slug === slug);
  return item ? { item, items } : null;
}

export async function findCatalogProduct(idOrSlug: string) {
  return (await getCatalog()).find((i) => i.id === idOrSlug || i.slug === idOrSlug) ?? null;
}

/**
 * Oferta para o redirecionamento /ir/<id>. `url` só existe quando há link real
 * cadastrado no admin; os dados de exemplo nunca levam a uma loja.
 */
export async function getOutboundOffer(offerId: string): Promise<{ item: ComparatorItem; offer: ComparatorOffer; url: string | null } | null> {
  for (const item of await getCatalog()) {
    const offer = item.offers.find((o) => o.id === offerId);
    if (offer) return { item, offer, url: catalogSource() === "admin" ? await adminOfferUrl(offerId) : null };
  }
  return null;
}
