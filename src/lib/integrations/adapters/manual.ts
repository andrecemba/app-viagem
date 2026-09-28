import { NO_CAPABILITIES, type OfferSource } from "../types";

/**
 * Lojas sem integração (Petz, Cobasi, Petlove e novas lojas): cadastro manual.
 * O ID sugerido é o último número longo da URL; o admin pode corrigir.
 */
export function parseGenericUrl(url: string) {
  try {
    const u = new URL(url);
    const sku = u.searchParams.get("sku") ?? u.searchParams.get("idsku") ?? u.searchParams.get("id");
    if (sku && /^[\w-]{3,40}$/.test(sku)) return { externalId: sku };
    const m = u.pathname.match(/(\d{4,})(?:\/p)?\/?$/);
    if (m) return { externalId: m[1] };
  } catch {
    return { externalId: null, hint: "URL inválida." };
  }
  return { externalId: null, hint: "Não foi possível extrair um código do anúncio. O campo é opcional." };
}

export const manualSource: OfferSource = {
  id: "manual",
  label: "Cadastro manual",
  kind: "manual",
  terms: "Preço, disponibilidade e links informados pelo admin. Não há coleta automática de páginas.",
  status: () => ({ state: "manual", missingEnv: [], note: "Ofertas cadastradas e atualizadas à mão." }),
  capabilities: () => NO_CAPABILITIES,
  parseListingUrl: parseGenericUrl,
};

/** Arquivo CSV ou feed autorizado pela loja/rede de afiliados: importado pelo admin em Lojas. */
export const csvFeedSource: OfferSource = {
  id: "csv",
  label: "Arquivo CSV / feed autorizado",
  kind: "feed",
  terms: "Use só arquivos ou feeds fornecidos ou autorizados pela loja ou pela rede de afiliados.",
  status: () => ({ state: "ativa", missingEnv: [], note: "Importação pelo painel (Lojas → Importar arquivo)." }),
  capabilities: () => ({ searchListings: false, refreshPrice: true, availability: true, shippingQuote: false, affiliateLink: false }),
  parseListingUrl: parseGenericUrl,
};
