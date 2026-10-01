/**
 * Eventos de uso do site. Nenhum dado pessoal: sem IP, sem cookie, sem
 * identificador de visitante. Cada evento guarda uma "foto" do produto no
 * momento do acesso, para os relatórios continuarem certos se o cadastro mudar.
 */
export type EventType = "busca" | "filtro" | "produto" | "clique";

export interface ProductSnapshot {
  productId: string;
  productName: string;
  brand: string;
  species: string;
  kind: string;
  sizes: string[];
  weightGrams: number;
}

export interface AnalyticsEvent extends Partial<ProductSnapshot> {
  at: string;
  type: EventType;
  /** Busca: termo normalizado e quantas embalagens apareceram. */
  q?: string;
  results?: number;
  /** Filtro: dimensão e valor escolhidos. */
  dim?: string;
  value?: string;
  /** Clique: loja, preço na hora do clique e se havia link cadastrado. */
  store?: string;
  price?: number;
  hasLink?: boolean;
}
