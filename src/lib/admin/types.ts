/**
 * Modelo de dados da área administrativa.
 *
 * Três entidades separadas:
 *  1. Produto canônico (`AdminProduct`): uma embalagem exata — marca, linha,
 *     fórmula, espécie, fase, porte, sabor e peso. Outro sabor ou peso = outro produto.
 *  2. Oferta (`AdminOffer`): o anúncio desse produto numa loja.
 *  3. Histórico (`HistoryEvent`): preços, verificações e edições, com resultado e responsável.
 *
 * Cada campo editável é um `FieldState`: guarda o valor automático, o valor
 * exibido, a origem, o horário e a eventual correção manual (com trava).
 */

export type Species = "caes" | "gatos";
export type FoodType = "seca" | "natural" | "umida" | "medicamentosa";
export type LifeStage = "filhote" | "adulto" | "senior" | "castrado" | "todas";
export type DogSize = "mini" | "pequeno" | "medio" | "grande" | "mini_pequeno" | "medio_grande" | "todos";
export type PublicationStatus = "rascunho" | "publicado" | "oculto";

/** Grau de confirmação de um dado. Nunca "verificado" sem alguém ter aberto a fonte. */
export type Verification = "verificado" | "fonte_localizada" | "pendente";

export interface AutoValue<T> {
  value: T | null;
  /** Ex.: "integração:amazon", "importação inicial", "demonstração". */
  source: string;
  at: string;
}

export interface ManualValue<T> {
  value: T | null;
  by: string;
  at: string;
  note?: string;
}

export interface FieldState<T> {
  /** Valor exibido no site e nas telas. */
  value: T | null;
  /** Última leitura automática aceita. */
  auto: AutoValue<T> | null;
  /** Correção manual vigente. */
  manual: ManualValue<T> | null;
  /** Travado: importações não alteram o valor exibido. */
  locked: boolean;
  /** Data em que a correção deve ser revista (opcional). */
  reviewAt: string | null;
  /** Valor automático recebido e ainda não aplicado (trava ou campo sensível). */
  pendingAuto: AutoValue<T> | null;
  verification: Verification;
}

export interface ProductFields {
  brand: FieldState<string>;
  line: FieldState<string>;
  formula: FieldState<string>;
  species: FieldState<Species>;
  lifeStage: FieldState<LifeStage>;
  size: FieldState<DogSize>;
  flavor: FieldState<string>;
  weightGrams: FieldState<number>;
  foodType: FieldState<FoodType>;
  gtin: FieldState<string>;
  manufacturerSku: FieldState<string>;
  vetIndication: FieldState<string>;
  kibbleSize: FieldState<string>;
  description: FieldState<string>;
  imageUrl: FieldState<string>;
}

export type ProductFieldKey = keyof ProductFields;

export interface SourceRef {
  url: string;
  kind: "fabricante" | "loja";
  /** O que a fonte comprova (ex.: título do anúncio com nome e peso). */
  evidence: string;
  /** Como foi conferida. */
  checkedHow: string;
  checkedAt: string;
}

export interface AdminProduct {
  id: string;
  status: PublicationStatus;
  fields: ProductFields;
  sources: SourceRef[];
  /** Observações de verificação (divergências entre fontes, dúvidas). */
  verificationNote: string;
  /** Situação da imagem após a última checagem. */
  imageStatus: "ok" | "ausente" | "quebrada" | "nao_verificada";
  createdAt: string;
  updatedAt: string;
}

export type Availability = "disponivel" | "indisponivel" | "removido";

export interface OfferFields {
  price: FieldState<number>;
  availability: FieldState<Availability>;
  url: FieldState<string>;
  affiliateUrl: FieldState<string>;
  sellerName: FieldState<string>;
  /** Título do anúncio na loja (usado para detectar divergências). */
  listingTitle: FieldState<string>;
  /** Variação escolhida no anúncio (ex.: "15 kg", "Frango"). */
  variationLabel: FieldState<string>;
}

export type OfferFieldKey = keyof OfferFields;

export interface AdminOffer {
  id: string;
  productId: string;
  storeId: string;
  externalId: string;
  fields: OfferFields;
  /** Oculta manualmente, ou automaticamente por dado antigo. */
  hidden: { reason: string; by: string; at: string } | null;
  /** "manual" (cadastro do admin), "integração:<loja>" ou "demonstração". */
  dataOrigin: string;
  commissionEligibility: "confirmada" | "nao_confirmada" | "sem_programa";
  /** Oferta fictícia do modo de demonstração. Nunca vai para o site. */
  demo: boolean;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
  /** Resultado da última checagem do link de afiliado. */
  linkStatus: "nao_verificado" | "ok" | "quebrado" | "redireciona_outro";
  imageStatus: "ok" | "quebrada" | "nao_verificada";
  sellerChangedAt: string | null;
  variationChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type IntegrationStatus = "pendente_configuracao" | "configurada" | "desconectada";

export interface StoreConfig {
  id: string;
  name: string;
  domains: string[];
  /** Frequência de consulta em horas (padrão 48). */
  frequencyHours: number;
  /** Depois desse prazo sem atualização a oferta fica "desatualizada". */
  staleAfterHours: number;
  /** Se definido, ofertas desatualizadas há mais que isso são ocultadas. null = nunca ocultar. */
  hideStaleAfterHours: number | null;
  integration: {
    kind: "api_oficial" | "feed_afiliado" | "somente_manual";
    description: string;
    /** Variáveis de ambiente necessárias (apenas nomes; valores ficam no servidor). */
    requiredEnv: string[];
    /** Condições da plataforma a respeitar. */
    terms: string;
  };
  affiliateProgram: string | null;
}

export type HistoryType =
  | "criacao"
  | "edicao_manual"
  | "importacao"
  | "preco"
  | "verificacao"
  | "trava"
  | "status"
  | "alerta"
  | "vinculo";

export interface HistoryEvent {
  id: string;
  at: string;
  entity: "product" | "offer" | "store" | "system";
  entityId: string;
  productId: string | null;
  offerId: string | null;
  type: HistoryType;
  field?: string;
  from?: unknown;
  to?: unknown;
  result: "ok" | "falha" | "ignorado" | "pendente";
  actor: string;
  message: string;
  demo?: boolean;
}

export type AlertSeverity = "critica" | "alta" | "media" | "baixa";

export type AlertType =
  | "preco_desatualizado"
  | "falha_repetida"
  | "integracao_pendente"
  | "link_afiliado"
  | "divergencia"
  | "mudanca_vendedor"
  | "mudanca_variacao"
  | "preco_fora_da_curva"
  | "indisponivel"
  | "imagem"
  | "possivel_duplicata"
  | "sem_elegibilidade"
  | "valor_automatico_divergente"
  | "dados_pendentes"
  | "revisao_agendada";

export interface AdminAlert {
  id: string;
  /** Chave de deduplicação: tipo + entidade + detalhe. */
  key: string;
  type: AlertType;
  severity: AlertSeverity;
  status: "aberto" | "resolvido" | "ignorado";
  productId: string | null;
  offerId: string | null;
  storeId: string | null;
  title: string;
  detail: string;
  suggestedAction: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastAttemptAt: string | null;
  occurrences: number;
  resolution: { by: string; at: string; note: string; action: string } | null;
  demo: boolean;
}

export interface RunStoreResult {
  storeId: string;
  consulted: number;
  updated: number;
  errors: number;
  skipped: number;
  message: string;
}

export interface CheckRun {
  id: string;
  trigger: "agendada" | "manual" | "oferta";
  startedAt: string;
  finishedAt: string | null;
  demo: boolean;
  stores: RunStoreResult[];
}

export interface AdminSettings {
  demoMode: boolean;
  /** Variação máxima aceita em relação à mediana do histórico antes de alertar. */
  priceOutlierUp: number;
  priceOutlierDown: number;
  failuresBeforeAlert: number;
}

export interface AdminDb {
  version: 1;
  settings: AdminSettings;
  stores: StoreConfig[];
  products: AdminProduct[];
  offers: AdminOffer[];
  history: HistoryEvent[];
  alerts: AdminAlert[];
  runs: CheckRun[];
}
