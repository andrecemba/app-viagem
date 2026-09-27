/**
 * Lojas conhecidas pelo comparador. `logo` fica null até existir um arquivo de
 * logotipo autorizado em `public/lojas/`; enquanto isso a interface mostra um
 * selo com as iniciais na cor da loja (nunca um logotipo copiado).
 */
export interface StoreInfo {
  slug: string;
  name: string;
  initials: string;
  color: string;
  /** Domínios aceitos para o link da oferta (o link de afiliado pode usar encurtadores do programa). */
  domains: string[];
  logo: string | null;
}

export const STORES: StoreInfo[] = [
  { slug: "amazon", name: "Amazon", initials: "a", color: "#232f3e", domains: ["amazon.com.br", "amzn.to"], logo: null },
  { slug: "mercado-livre", name: "Mercado Livre", initials: "ML", color: "#ffe600", domains: ["mercadolivre.com.br", "mercadolivre.com", "meli.la"], logo: null },
  { slug: "shopee", name: "Shopee", initials: "S", color: "#ee4d2d", domains: ["shopee.com.br", "s.shopee.com.br"], logo: null },
  { slug: "petz", name: "Petz", initials: "P", color: "#00a0df", domains: ["petz.com.br"], logo: null },
  { slug: "cobasi", name: "Cobasi", initials: "C", color: "#0060af", domains: ["cobasi.com.br", "awin1.com"], logo: null },
  { slug: "petlove", name: "Petlove", initials: "PL", color: "#6a1b9a", domains: ["petlove.com.br"], logo: null },
  { slug: "magalu", name: "Magalu", initials: "M", color: "#0086ff", domains: ["magazineluiza.com.br", "magazinevoce.com.br"], logo: null },
  { slug: "mercado-exemplo", name: "Mercado Exemplo", initials: "ME", color: "#6b7280", domains: [], logo: null },
];

const bySlug = new Map(STORES.map((s) => [s.slug, s]));

export function storeInfo(slug: string): StoreInfo {
  return bySlug.get(slug) ?? { slug, name: slug, initials: slug.slice(0, 2).toUpperCase(), color: "#6b7280", domains: [], logo: null };
}

/** Lojas que o admin pode escolher ao cadastrar um preço. */
export const ADMIN_STORES = STORES.filter((s) => s.slug !== "mercado-exemplo");
