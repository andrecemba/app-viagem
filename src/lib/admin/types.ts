import type { DogSize, FoodType, LifeStage, Need, Species } from "@/lib/catalog/vocab";

export type { DogSize, FoodType, LifeStage, Need, Species };

/**
 * Modelo de dados da administração (versão 2, simplificada).
 *
 * Um produto = uma embalagem exata (marca + fórmula + sabor + peso). Os campos
 * seguem os mesmos tópicos que o cliente vê na página do produto. Campo vazio
 * = "Pendente de verificação": nada é deduzido de embalagens parecidas.
 */

export type PublicationStatus = "rascunho" | "publicado" | "oculto";

export interface PricePoint {
  at: string;
  price: number;
}

/** Preço de uma loja para este produto, cadastrado à mão. */
export interface AdminOffer {
  id: string;
  store: string;
  price: number | null;
  /** Link de afiliado (ou link comum da loja). Fica só no servidor; o site usa /ir/<id>. */
  url: string | null;
  sellerName: string | null;
  available: boolean;
  updatedAt: string;
  /** Últimos preços (até 90 dias), usados para a média de "preço normal". */
  history: PricePoint[];
}

export interface SourceRef {
  url: string;
  /** O que a fonte comprova. */
  note: string;
}

export interface AdminProduct {
  id: string;
  slug: string;
  status: PublicationStatus;

  // 1. Identificação
  brand: string | null;
  line: string | null;
  formula: string | null;
  flavor: string | null;

  // 2. Para quem
  species: Species | null;
  lifeStage: LifeStage | null;
  size: DogSize | null;

  // 3. Tipo
  foodType: FoodType | null;
  vetNote: string | null;

  // 4. Embalagem
  weightGrams: number | null;
  unitCount: number | null;

  // 5. Indicações e características
  needs: Need[];
  kibbleSize: string | null;

  // 6. Descrição
  description: string | null;

  // 7. Códigos e foto
  gtin: string | null;
  sku: string | null;
  imageUrl: string | null;

  // 8. Fontes e conferência
  sources: SourceRef[];
  note: string;
  /** Alguém conferiu os dados na embalagem ou no site do fabricante. */
  verified: boolean;

  offers: AdminOffer[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminSettings {
  /** Parte dos cliques que vira compra (0.05 = 5%). null = não informado. */
  conversionRate: number | null;
  /** Comissão por loja (0.08 = 8%). Sem valor = não entra na estimativa. */
  commission: Record<string, number | null>;
}

export interface AdminDb {
  version: 2;
  products: AdminProduct[];
  settings: AdminSettings;
}
