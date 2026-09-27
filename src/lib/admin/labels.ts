import type {
  AlertSeverity,
  AlertType,
  Availability,
  DogSize,
  FoodType,
  LifeStage,
  ProductFieldKey,
  PublicationStatus,
  Species,
  Verification,
} from "./types";

export const SPECIES_LABEL: Record<Species, string> = { caes: "Cachorro", gatos: "Gato" };

export const FOOD_TYPE_LABEL: Record<FoodType, string> = {
  seca: "Ração seca",
  natural: "Natural",
  umida: "Úmida",
  medicamentosa: "Medicamentosa",
};

export const LIFE_STAGE_LABEL: Record<LifeStage, string> = {
  filhote: "Filhote",
  adulto: "Adulto",
  senior: "Sênior",
  castrado: "Adulto castrado",
  todas: "Todas as fases",
};

export const SIZE_LABEL: Record<DogSize, string> = {
  mini: "Mini",
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  mini_pequeno: "Mini e pequeno",
  medio_grande: "Médio e grande",
  todos: "Todos os portes",
};

export const STATUS_LABEL: Record<PublicationStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  oculto: "Oculto",
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  disponivel: "Disponível",
  indisponivel: "Indisponível",
  removido: "Anúncio removido",
};

export const VERIFICATION_LABEL: Record<Verification, string> = {
  verificado: "Verificado",
  fonte_localizada: "Fonte localizada · conferir página",
  pendente: "Pendente de verificação",
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const SEVERITY_ORDER: AlertSeverity[] = ["critica", "alta", "media", "baixa"];

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  preco_desatualizado: "Preço desatualizado",
  falha_repetida: "Falha repetida na consulta",
  integracao_pendente: "Integração pendente ou desconectada",
  link_afiliado: "Link de afiliado",
  divergencia: "Divergência entre produto e anúncio",
  mudanca_vendedor: "Mudança de vendedor",
  mudanca_variacao: "Mudança de variação do anúncio",
  preco_fora_da_curva: "Preço fora do histórico",
  indisponivel: "Indisponível ou removido",
  imagem: "Imagem ausente ou quebrada",
  possivel_duplicata: "Possível ficha duplicada",
  sem_elegibilidade: "Comissão não confirmada",
  valor_automatico_divergente: "Valor automático aguardando revisão",
  dados_pendentes: "Dados pendentes de verificação",
  revisao_agendada: "Revisão agendada vencida",
};

export const FIELD_LABEL: Record<ProductFieldKey, string> = {
  brand: "Marca",
  line: "Linha",
  formula: "Fórmula",
  species: "Espécie",
  lifeStage: "Fase da vida",
  size: "Porte",
  flavor: "Sabor",
  weightGrams: "Peso (g)",
  foodType: "Tipo de ração",
  gtin: "GTIN/EAN",
  manufacturerSku: "SKU do fabricante",
  vetIndication: "Indicação veterinária",
  kibbleSize: "Tamanho do grão",
  description: "Descrição",
  imageUrl: "Imagem da embalagem (URL)",
};

/** Campos que nunca mudam por importação sem revisão (mostram diferença antes). */
export const SENSITIVE_PRODUCT_FIELDS: ProductFieldKey[] = ["brand", "formula", "flavor", "weightGrams", "imageUrl"];

export function formatGrams(grams: number | null | undefined) {
  if (grams == null) return "—";
  if (grams >= 1000) return `${(grams / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
  return `${grams.toLocaleString("pt-BR")} g`;
}
