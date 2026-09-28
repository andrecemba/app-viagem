import type { DogSize, FoodType, LifeStage, Need, Species } from "@/lib/catalog/vocab";

export type { DogSize, FoodType, LifeStage, Need, Species };

export type StoreMode = "manual" | "feed" | "api";
export type PriceDisplay = "sempre" | "somente_api";

export interface Store {
  id: string;
  name: string;
  /** Domínios aceitos para a URL do anúncio. */
  domains: string[];
  /** Domínios extras aceitos só no link de afiliado (encurtadores oficiais do programa). */
  affiliateDomains: string[];
  mode: StoreMode;
  /** Adaptador de integração (src/lib/integrations). null = só manual. */
  adapter: string | null;
  /** "somente_api": o site só mostra preço obtido pela API oficial e recente (regra da Amazon). */
  priceDisplay: PriceDisplay;
  color: string;
  logoUrl: string | null;
  active: boolean;
  createdAt: string;
}

export interface SourceRef {
  url: string;
  note: string;
}

/** A ração exata: espécie + marca + linha + indicação + sabor + peso (+ castrado). */
export interface Product {
  id: number;
  slug: string;
  species: Species;
  brand: string;
  line: string | null;
  indication: string;
  flavor: string | null;
  weightGrams: number;
  unitCount: number | null;
  neutered: boolean;
  lifeStage: LifeStage | null;
  size: DogSize | null;
  foodType: FoodType | null;
  needs: Need[];
  gtin: string | null;
  imageUrl: string | null;
  description: string | null;
  sources: SourceRef[];
  notes: string | null;
  active: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Availability = "disponivel" | "indisponivel" | "desconhecida";
export type DataSource = "manual" | "feed" | "api";

/** Campos que o admin pode corrigir numa oferta importada. */
export const OVERRIDABLE_FIELDS = [
  "price",
  "previousPrice",
  "availability",
  "listingWeightGrams",
  "listingFlavor",
  "imageUrl",
  "url",
  "affiliateUrl",
  "freeShipping",
  "notes",
] as const;
export type OverridableField = (typeof OVERRIDABLE_FIELDS)[number];

export interface OfferValues {
  url: string;
  affiliateUrl: string | null;
  price: number | null;
  previousPrice: number | null;
  availability: Availability;
  /** Indicação geral do anúncio (não é cotação de frete). null = desconhecido. */
  freeShipping: boolean | null;
  listingWeightGrams: number | null;
  listingFlavor: string | null;
  imageUrl: string | null;
  notes: string | null;
}

export interface Override {
  field: OverridableField;
  value: unknown;
  createdBy: string;
  createdAt: string;
  note: string | null;
}

/** Oferta como está no banco (valores automáticos ou do cadastro manual). */
export interface OfferRecord extends OfferValues {
  id: number;
  productId: number;
  storeId: string;
  externalId: string | null;
  dataSource: DataSource;
  currency: string;
  priceObtainedAt: string | null;
  priceSource: string | null;
  previousPriceAt: string | null;
  listingTitle: string | null;
  matchStatus: "confirmada" | "incerta";
  active: boolean;
  isDemo: boolean;
  lastCheckedAt: string | null;
  lastSyncStatus: "ok" | "erro" | null;
  lastSyncError: string | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

/** Oferta com as correções do admin aplicadas. `auto` guarda o valor importado de cada campo corrigido. */
export interface Offer extends OfferRecord {
  overrides: Partial<Record<OverridableField, Override>>;
  auto: Partial<OfferValues>;
}

export interface OfferEvent {
  id: number;
  offerId: number;
  at: string;
  kind: "criacao" | "edicao" | "sincronizacao" | "erro" | "correcao" | "volta_automatico" | "importacao" | "confirmacao";
  actor: string;
  price: number | null;
  availability: Availability | null;
  message: string | null;
}

export interface ShippingQuote {
  offerId: number;
  cep: string;
  cost: number;
  currency: string;
  deadlineDays: number | null;
  quotedAt: string;
  expiresAt: string;
  source: string;
}

export interface Settings {
  /** Depois de quantas horas o preço é "desatualizado" (e a oferta entra na atualização programada). */
  staleHours: number;
  /** Validade de uma cotação de frete, em horas. */
  shippingQuoteHours: number;
  conversionRate: number | null;
  commission: Record<string, number | null>;
}
