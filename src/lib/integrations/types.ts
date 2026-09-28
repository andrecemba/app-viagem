import type { Availability } from "@/lib/domain/types";

/** O que cada fonte consegue fazer. Varia por loja e pela conta: nunca presumir. */
export interface SourceCapabilities {
  searchListings: boolean;
  refreshPrice: boolean;
  availability: boolean;
  shippingQuote: boolean;
  affiliateLink: boolean;
}

export const NO_CAPABILITIES: SourceCapabilities = {
  searchListings: false,
  refreshPrice: false,
  availability: false,
  shippingQuote: false,
  affiliateLink: false,
};

export interface SourceStatus {
  /** ativa: pode consultar; pendente: falta credencial ou aprovação; manual: não há integração. */
  state: "ativa" | "pendente" | "manual";
  /** Variáveis de ambiente que faltam (só nomes, nunca valores). */
  missingEnv: string[];
  note: string;
}

/** Anúncio normalizado: o mesmo formato para qualquer loja. */
export interface NormalizedListing {
  externalId: string;
  url: string | null;
  title: string | null;
  price: number | null;
  currency: string;
  availability: Availability;
  /** Indicação geral de frete grátis do anúncio (não é cotação). */
  freeShipping: boolean | null;
  imageUrl: string | null;
  listingWeightGrams: number | null;
  listingFlavor: string | null;
  affiliateUrl: string | null;
  obtainedAt: string;
}

export interface ShippingQuoteResult {
  cost: number;
  currency: string;
  deadlineDays: number | null;
}

export interface ParsedListingUrl {
  externalId: string | null;
  /** Explicação quando não deu para extrair o ID (o admin pode digitar). */
  hint?: string;
}

/** Interface única para fontes de ofertas. Cada loja tem um adaptador independente. */
export interface OfferSource {
  id: string;
  label: string;
  /** Como a fonte obtém dados: API oficial, arquivo/feed ou só manual. */
  kind: "api" | "feed" | "manual";
  status(): SourceStatus;
  capabilities(): SourceCapabilities;
  parseListingUrl(url: string): ParsedListingUrl;
  fetchListing?(externalId: string): Promise<NormalizedListing>;
  quoteShipping?(externalId: string, cep: string): Promise<ShippingQuoteResult>;
  /** Regras de uso da plataforma relevantes para o admin. */
  terms: string;
}

export type IntegrationErrorKind = "configuracao" | "permissao" | "nao_encontrado" | "limite" | "indisponivel" | "api_mudou" | "rede" | "dados";

/** Falha de integração: nunca apaga o último preço válido. */
export class IntegrationError extends Error {
  constructor(
    message: string,
    public kind: IntegrationErrorKind,
    public status?: number,
  ) {
    super(message);
  }
}

export const ERROR_LABEL: Record<IntegrationErrorKind, string> = {
  configuracao: "Integração não configurada",
  permissao: "Sem permissão na API (403/401)",
  nao_encontrado: "Anúncio não encontrado",
  limite: "Limite de chamadas atingido",
  indisponivel: "API da loja indisponível",
  api_mudou: "Resposta da API em formato inesperado",
  rede: "Falha de rede",
  dados: "Dados do anúncio insuficientes",
};
