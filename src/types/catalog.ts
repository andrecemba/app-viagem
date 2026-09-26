/**
 * Tipos do domínio. Espelham o modelo de dados planejado para o Supabase
 * (Fase 1): cada interface corresponde a uma tabela ou a uma view.
 */

export type SpeciesSlug = "caes" | "gatos";
export type FoodTypeSlug = "racao-seca" | "racao-umida" | "petiscos" | "dietas-veterinarias";
export type LifeStageSlug = "filhote" | "adulto" | "senior" | "castrado";
export type SizeSlug = "mini" | "pequeno" | "medio" | "grande";
export type SegmentSlug = "economica" | "standard" | "premium" | "super-premium";
export type RefinementSlug = "sem-corante" | "grain-free" | "light" | "pele-sensivel";
export type PackageRangeSlug = "ate-3kg" | "3-10kg" | "acima-10kg";

/** Formato físico do alimento: define a métrica de preço (R$/kg ou R$/100 g). */
export type FoodFormat = "dry" | "wet" | "snack";

/** Tabela `categories` — hierárquica e genérica (não acoplada a "ração"). */
export interface Category {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  status: "active" | "coming_soon";
  sortOrder: number;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  /** Cor do placeholder (círculo com iniciais) até o admin enviar o logo oficial. */
  color: string;
  initials: string;
  logoUrl: string | null;
  species: SpeciesSlug[];
  description: string;
}

export interface ProductLine {
  id: string;
  brandId: string;
  slug: string;
  name: string;
}

/** Linha da tabela de consumo diário copiada da embalagem. */
export interface FeedingRow {
  petWeightKg: number;
  gramsPerDay: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  brandId: string;
  lineId: string;
  species: SpeciesSlug;
  foodType: FoodTypeSlug;
  format: FoodFormat;
  lifeStages: LifeStageSlug[];
  /** Vazio = todos os portes (ou não se aplica, como para gatos). */
  sizes: SizeSlug[];
  segment: SegmentSlug;
  flavor: string;
  refinements: RefinementSlug[];
  /** Peso líquido total da embalagem, em gramas. */
  netWeightGrams: number;
  /** Para sachês/latas/petiscos: quantidade de unidades na embalagem. */
  unitCount: number | null;
  ean: string | null;
  /** Agrupa embalagens diferentes do mesmo produto (ex.: 3 kg e 15 kg). */
  variantGroup: string;
  feedingTable: FeedingRow[] | null;
}

export type StoreType = "marketplace" | "pet_store" | "supermarket";
export type AffiliateNetwork = "amazon" | "mercadolivre" | "shopee" | "awin" | "petz" | null;
export type CollectionMethod = "official_api" | "vtex_catalog" | "json_ld" | "playwright" | "manual";

/** Tabela `stores`. */
export interface Store {
  id: string;
  slug: string;
  name: string;
  /** "na Amazon", "no Mercado Livre". */
  preposition: "na" | "no";
  type: StoreType;
  color: string;
  affiliateProgram: string | null;
  hasAffiliateProgram: boolean;
  affiliateNetwork: AffiliateNetwork;
  collectionMethod: CollectionMethod;
  status: "active" | "paused" | "blocked";
}

export type AffiliateStatus = "ok" | "missing";

export interface Offer {
  id: string;
  productId: string;
  storeId: string;
  /** URL exata do produto na loja (sem afiliado). */
  url: string;
  sellerName: string;
  price: number;
  pixPrice: number | null;
  subscriptionPrice: number | null;
  freeShipping: boolean;
  inStock: boolean;
  /** Ofertas suspeitas (outliers, avaria, validade próxima) aguardam revisão humana. */
  status: "active" | "pending_review";
  lastCheckedAt: string;
  /** Percentual de comissão (0.11 = 11%). Nunca influencia a ordenação principal. */
  commissionRate: number | null;
  /** Link gerado pela API oficial do programa (em cache). */
  affiliateApiUrl: string | null;
  /** Link de afiliado cadastrado manualmente pelo admin. */
  affiliateManualUrl: string | null;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface OfferPriceHistory {
  offerId: string;
  points: PricePoint[];
}

export type ComplementCategorySlug =
  | "petiscos-ossos"
  | "mordedores-brinquedos"
  | "tapete-higienico"
  | "saquinho-fezes"
  | "coleira-guia"
  | "shampoo"
  | "higiene-bucal"
  | "comedouro-bebedouro"
  | "caminha"
  | "areia-sanitaria"
  | "caixa-areia"
  | "arranhador"
  | "saches"
  | "fonte-agua"
  | "escova-pelos"
  | "rampa-escada";

export interface ComplementaryOffer {
  id: string;
  storeId: string;
  url: string;
  price: number;
  inStock: boolean;
  commissionRate: number | null;
}

export interface ComplementaryProduct {
  id: string;
  slug: string;
  name: string;
  category: ComplementCategorySlug;
  species: SpeciesSlug[];
  /** Vazio = qualquer fase de vida. */
  lifeStages: LifeStageSlug[];
  offers: ComplementaryOffer[];
}

/** Tabela `complementary_rules`. */
export interface ComplementaryRule {
  id: string;
  species: SpeciesSlug;
  foodTypes: FoodTypeSlug[];
  lifeStages: LifeStageSlug[];
  suggest: { category: ComplementCategorySlug; relevance: number }[];
}
