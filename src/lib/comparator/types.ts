import type { FoodFormat, LifeStageSlug, SizeSlug, SpeciesSlug } from "@/types/catalog";

/** Tipos de alimento exibidos nos filtros do comparador, na ordem da interface. */
export type FoodKind = "seca" | "natural" | "umida" | "medicamentosa";

export interface ComparatorBrand {
  slug: string;
  name: string;
  color: string;
  initials: string;
}

/** Oferta de uma loja para a embalagem exata. Não carrega comissão nem URL de afiliado. */
export interface ComparatorOffer {
  id: string;
  storeName: string;
  storeColor: string;
  storeKind: "Marketplace" | "Pet shop" | "Supermercado";
  sellerName: string;
  price: number;
  pixPrice: number | null;
  freeShipping: boolean;
  inStock: boolean;
  lastCheckedAt: string;
}

/**
 * Um item do comparador = uma combinação exata de fórmula, sabor e peso.
 * Embalagens de pesos diferentes são sempre itens diferentes.
 */
export interface ComparatorItem {
  id: string;
  slug: string;
  /** Mesma fórmula e sabor, pesos diferentes (usado para "outras embalagens"). */
  family: string;
  brand: ComparatorBrand;
  lineName: string;
  /** Nome da fórmula, sem o peso. */
  title: string;
  species: SpeciesSlug;
  kind: FoodKind;
  format: FoodFormat;
  lifeStages: LifeStageSlug[];
  /** Vazio = todos os portes (ou não se aplica, no caso de gatos). */
  sizes: SizeSlug[];
  flavor: string;
  netWeightGrams: number;
  unitCount: number | null;
  /** Foto oficial verificada da embalagem; null = mostrar o marcador ilustrativo. */
  photoUrl: string | null;
  /** Ordenadas pelo menor preço; sem estoque no fim. */
  offers: ComparatorOffer[];
  bestPrice: number;
  storeCount: number;
}
