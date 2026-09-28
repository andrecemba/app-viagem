import type { StoreInput } from "@/lib/domain/stores";

/**
 * Lojas iniciais. Incluir outra loja: pelo painel (Lojas → Nova loja) ou aqui.
 * Nenhuma credencial fica neste arquivo: integrações usam variáveis de ambiente do servidor.
 */
export const INITIAL_STORES: (StoreInput & { id: string })[] = [
  {
    id: "mercado-livre",
    name: "Mercado Livre",
    domains: ["mercadolivre.com.br", "mercadolibre.com"],
    affiliateDomains: ["mercadolivre.com", "meli.la"],
    mode: "api",
    adapter: "mercado-livre",
    priceDisplay: "sempre",
    color: "#ffe600",
    logoUrl: null,
    active: true,
  },
  {
    id: "shopee",
    name: "Shopee",
    domains: ["shopee.com.br"],
    affiliateDomains: ["shope.ee"],
    mode: "manual",
    adapter: null,
    priceDisplay: "sempre",
    color: "#ee4d2d",
    logoUrl: null,
    active: true,
  },
  {
    id: "amazon",
    name: "Amazon",
    domains: ["amazon.com.br"],
    affiliateDomains: ["amzn.to"],
    mode: "api",
    adapter: "amazon",
    priceDisplay: "somente_api",
    color: "#232f3e",
    logoUrl: null,
    active: true,
  },
  { id: "petz", name: "Petz", domains: ["petz.com.br"], affiliateDomains: [], mode: "manual", adapter: null, priceDisplay: "sempre", color: "#00a0df", logoUrl: null, active: true },
  { id: "cobasi", name: "Cobasi", domains: ["cobasi.com.br"], affiliateDomains: ["awin1.com"], mode: "manual", adapter: null, priceDisplay: "sempre", color: "#0060af", logoUrl: null, active: true },
  { id: "petlove", name: "Petlove", domains: ["petlove.com.br"], affiliateDomains: [], mode: "manual", adapter: null, priceDisplay: "sempre", color: "#6a1b9a", logoUrl: null, active: true },
];
