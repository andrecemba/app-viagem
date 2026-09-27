import type { AffiliateResult } from "@/lib/affiliate";
import type { ComparatorItem } from "@/lib/comparator/types";
import type { FunnelDimension, FunnelSelection, OfferFilters } from "@/lib/funnel/filters";
import type { OfferBadge } from "@/lib/pricing/badges";
import type { UnitPrice } from "@/lib/pricing/unitPrice";
import type {
  Brand,
  Category,
  ComplementCategorySlug,
  Offer,
  PricePoint,
  Product,
  ProductLine,
  SpeciesSlug,
  Store,
} from "@/types/catalog";

/** Oferta pronta para exibição (a comissão nunca vai para componentes públicos). */
export interface OfferView {
  offer: Offer;
  store: Store;
  unitPrice: UnitPrice;
  badges: OfferBadge[];
}

export interface ProductListing {
  product: Product;
  brand: Brand;
  line: ProductLine | undefined;
  best: OfferView;
  offerCount: number;
  maxPrice: number;
}

export interface StoreHistory {
  storeId: string;
  storeName: string;
  color: string;
  points: PricePoint[];
}

export interface ProductDetail {
  product: Product;
  brand: Brand;
  line: ProductLine | undefined;
  /** Ordem honesta; ofertas sem estoque vão para o final. */
  offers: OfferView[];
  history: StoreHistory[];
  variants: ProductListing[];
}

export interface RelatedItemView {
  id: string;
  name: string;
  category: ComplementCategorySlug;
  categoryLabel: string;
  offerId: string;
  price: number;
  store: Store;
  sameStore: boolean;
}

export interface MonthlyKitItem {
  role: string;
  name: string;
  offerId: string;
  price: number;
  store: Store;
  href: string | null;
}

export interface MonthlyKit {
  items: MonthlyKitItem[];
  total: number;
}

export interface OutboundTarget {
  offerId: string;
  kind: "offer" | "complementary";
  productName: string;
  store: Store;
  price: number;
  affiliate: AffiliateResult;
  /** Só para a tela de debug em desenvolvimento / painel admin. */
  commissionRate: number | null;
}

export interface CalculatorProduct {
  slug: string;
  name: string;
  species: SpeciesSlug;
  netWeightGrams: number;
  bestPrice: number;
  storeName: string;
  storePreposition: Store["preposition"];
  feedingTable: Product["feedingTable"];
}

export interface BrandPage {
  brand: Brand;
  lines: ProductLine[];
  listings: ProductListing[];
}

/**
 * Contrato da camada de dados. Hoje implementado por `mock-source.ts`;
 * na Fase 1, `supabase-source.ts` implementa a mesma interface e nenhum
 * componente precisa mudar.
 */
export interface DataSource {
  getCategories(): Promise<Category[]>;
  getStores(): Promise<Store[]>;
  getBrands(species?: SpeciesSlug): Promise<Brand[]>;
  getBrandPage(slug: string): Promise<BrandPage | null>;
  getOffers(filters: OfferFilters): Promise<ProductListing[]>;
  getFunnelCounts(filters: OfferFilters, dimension: FunnelDimension): Promise<Record<string, number>>;
  getTopDeals(selection: FunnelSelection, limit: number): Promise<ProductListing[]>;
  getProduct(slug: string): Promise<ProductDetail | null>;
  getRelated(productSlug: string, storeId?: string, options?: { sameStoreOnly?: boolean; limit?: number }): Promise<RelatedItemView[]>;
  getMonthlyKit(productSlug: string): Promise<MonthlyKit | null>;
  getOutboundTarget(offerId: string): Promise<OutboundTarget | null>;
  getCalculatorProducts(): Promise<CalculatorProduct[]>;
  getProductSlugs(): Promise<string[]>;
  /** Catálogo da home: uma entrada por embalagem exata, com as ofertas já ordenadas. */
  getComparatorItems(): Promise<ComparatorItem[]>;
}
