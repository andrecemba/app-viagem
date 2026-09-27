import type { FilterSize, FoodType, LifeStage, Need, Species } from "@/lib/catalog/vocab";

/** Tipos de alimento exibidos nos filtros do comparador, na ordem da interface. */
export type FoodKind = FoodType;

export interface ComparatorBrand {
  slug: string;
  name: string;
  color: string;
  initials: string;
  /** Logotipo autorizado (arquivo em public/marcas); null = selo com iniciais. */
  logo: string | null;
}

/** Oferta de uma loja para a embalagem exata. Não carrega comissão nem URL de afiliado. */
export interface ComparatorOffer {
  id: string;
  storeSlug: string;
  storeName: string;
  sellerName: string;
  price: number;
  pixPrice: number | null;
  freeShipping: boolean;
  inStock: boolean;
  lastCheckedAt: string;
}

/**
 * Um item do comparador = uma combinação exata de fórmula, sabor e peso.
 * Embalagens de pesos diferentes são itens diferentes, agrupados pela `family`.
 */
export interface ComparatorItem {
  id: string;
  slug: string;
  /** Mesma fórmula e sabor, pesos diferentes. */
  family: string;
  brand: ComparatorBrand;
  lineName: string;
  /** Nome da fórmula, sem o peso. */
  title: string;
  species: Species;
  kind: FoodKind;
  lifeStages: LifeStage[];
  /** Cães: portes atendidos (os 4 = todos). Gatos: null. */
  sizes: FilterSize[] | null;
  needs: Need[];
  /** "" = não informado. */
  flavor: string;
  netWeightGrams: number;
  unitCount: number | null;
  kibbleSize: string | null;
  vetNote: string | null;
  gtin: string | null;
  description: string | null;
  /** Foto oficial verificada da embalagem; null = mostrar o marcador ilustrativo. */
  photoUrl: string | null;
  /** Ordenadas pelo menor preço; sem estoque no fim. */
  offers: ComparatorOffer[];
  /** Menor preço entre as lojas com estoque (null = sem oferta disponível). */
  bestPrice: number | null;
  storeCount: number;
  /** Média do menor preço nos últimos 30 dias (null = sem histórico suficiente). */
  avgPrice30d: number | null;
}
