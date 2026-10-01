/**
 * Vocabulário único do catálogo: o mesmo texto aparece no cadastro do admin,
 * nos filtros do site e nos tópicos da página do produto.
 */

export type Species = "caes" | "gatos";
export type LifeStage = "filhote" | "adulto" | "senior" | "todas";
export type DogSize = "mini" | "pequeno" | "medio" | "grande" | "mini_pequeno" | "medio_grande" | "todos";
export type FoodType = "seca" | "natural" | "umida" | "medicamentosa";
export type Need = "castrados" | "controle_peso" | "pele_sensivel" | "digestao_sensivel" | "urinario" | "sem_graos" | "sem_corantes";

export const SPECIES_LABEL: Record<Species, string> = { caes: "Cachorro", gatos: "Gato" };
export const SPECIES_PLURAL: Record<Species, string> = { caes: "Cachorros", gatos: "Gatos" };

export const LIFE_STAGE_LABEL: Record<LifeStage, string> = {
  filhote: "Filhote",
  adulto: "Adulto",
  senior: "Sênior (idoso)",
  todas: "Todas as idades",
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

/** Portes simples usados no filtro do site; os combinados valem para os dois. */
export const FILTER_SIZES = ["mini", "pequeno", "medio", "grande"] as const;
export type FilterSize = (typeof FILTER_SIZES)[number];

export function sizesCovered(size: DogSize | null): FilterSize[] {
  switch (size) {
    case null:
    case "todos":
      return [...FILTER_SIZES];
    case "mini_pequeno":
      return ["mini", "pequeno"];
    case "medio_grande":
      return ["medio", "grande"];
    default:
      return [size];
  }
}

export const FOOD_TYPE_LABEL: Record<FoodType, string> = {
  seca: "Ração seca",
  natural: "Natural",
  umida: "Úmida (sachê, lata, patê)",
  medicamentosa: "Medicamentosa (veterinária)",
};

export const NEED_LABEL: Record<Need, string> = {
  castrados: "Castrados",
  controle_peso: "Controle de peso (light)",
  pele_sensivel: "Pele e pelos sensíveis",
  digestao_sensivel: "Digestão sensível",
  urinario: "Trato urinário",
  sem_graos: "Sem grãos",
  sem_corantes: "Sem corantes artificiais",
};

export const NEEDS = Object.keys(NEED_LABEL) as Need[];

/** Faixas de peso da embalagem para o filtro (limites em gramas, inclusivos). */
export const WEIGHT_RANGES = [
  { slug: "ate-1kg", label: "Até 1 kg", hint: "sachês e pacotes pequenos", min: 0, max: 1000 },
  { slug: "1-3kg", label: "1 a 3 kg", hint: "", min: 1001, max: 3000 },
  { slug: "3-10kg", label: "3 a 10 kg", hint: "", min: 3001, max: 10000 },
  { slug: "10-15kg", label: "10 a 15 kg", hint: "", min: 10001, max: 15000 },
  { slug: "acima-15kg", label: "Acima de 15 kg", hint: "", min: 15001, max: Infinity },
] as const;
export type WeightRange = (typeof WEIGHT_RANGES)[number]["slug"];

export function weightRangeOf(grams: number): WeightRange {
  return WEIGHT_RANGES.find((r) => grams >= r.min && grams <= r.max)!.slug;
}

export function formatGrams(grams: number | null | undefined): string {
  if (grams == null) return "—";
  if (grams < 1000) return `${grams} g`;
  const kg = grams / 1000;
  return `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg`;
}

export const LIFE_STAGE_VALUES = Object.keys(LIFE_STAGE_LABEL) as LifeStage[];
export const DOG_SIZE_VALUES = Object.keys(SIZE_LABEL) as DogSize[];
export const FOOD_TYPE_VALUES = Object.keys(FOOD_TYPE_LABEL) as FoodType[];
