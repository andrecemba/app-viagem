import type { Availability } from "@/lib/domain/types";
import type { FilterSize, FoodType, LifeStage, Need, Species } from "@/lib/catalog/vocab";

/** Tipos de alimento exibidos nos filtros do comparador, na ordem da interface. */
export type FoodKind = FoodType;

export interface ComparatorBrand {
  slug: string;
  name: string;
  color: string;
  initials: string;
  /** Logotipo autorizado; null = selo com iniciais. */
  logo: string | null;
}

/** Oferta pública de uma loja para a embalagem exata. Nunca carrega URL de afiliado nem segredo. */
export interface ComparatorOffer {
  id: string;
  storeSlug: string;
  storeName: string;
  storeColor: string;
  storeLogo: string | null;
  sellerName: string;
  /** null = sem preço público (ex.: Amazon sem API aprovada). */
  price: number | null;
  priceObtainedAt: string | null;
  /** Preço anterior registrado por nós (com a data em que valia). */
  previousPrice: number | null;
  previousPriceAt: string | null;
  pixPrice: number | null;
  availability: Availability;
  inStock: boolean;
  /** Indicação geral do anúncio (não é cotação para o CEP). */
  freeShipping: boolean | null;
  listingWeightGrams: number | null;
  listingFlavor: string | null;
  stale: boolean;
  isDemo: boolean;
  /** Motivo de não mostrar preço (regra da loja). */
  priceHiddenReason: string | null;
  lastCheckedAt: string;
}

/**
 * Um item do comparador = uma ração exata (espécie, marca, linha, indicação,
 * sabor e peso). Pesos diferentes são itens diferentes, agrupados pela `family`.
 */
export interface ComparatorItem {
  id: string;
  slug: string;
  family: string;
  brand: ComparatorBrand;
  lineName: string;
  /** Linha + indicação, sem o peso. Ex.: "Golden Fórmula Cães Adultos Raças Médias". */
  title: string;
  indication: string;
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
  photoUrl: string | null;
  /** Ordenadas pelo menor preço; sem preço e indisponíveis no fim. */
  offers: ComparatorOffer[];
  /** Menor preço público entre as lojas com estoque (null = nenhum). */
  bestPrice: number | null;
  /** Lojas com preço público e estoque. */
  storeCount: number;
  /** Horário do preço mais recente entre as ofertas com preço. */
  updatedAt: string | null;
  /** O menor preço está fora do prazo de atualização. */
  bestPriceStale: boolean;
  avgPrice30d: number | null;
  /** Tem preço ou produto de exemplo (mostra o selo). */
  isDemo: boolean;
  /** O próprio produto é de exemplo (fica fora do sitemap). */
  demoProduct: boolean;
}
