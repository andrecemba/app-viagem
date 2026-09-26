import type {
  FoodTypeSlug,
  LifeStageSlug,
  PackageRangeSlug,
  RefinementSlug,
  SegmentSlug,
  SizeSlug,
  SpeciesSlug,
} from "@/types/catalog";

/**
 * Vocabulário do funil. Os slugs são usados na URL
 * (ex.: /caes/racao-seca/adulto/medio/premium/golden) e são únicos entre
 * dimensões, o que permite reconhecer cada segmento pelo próprio valor.
 */

export type IconKey =
  | "dog"
  | "cat"
  | "dry"
  | "wet"
  | "snack"
  | "vet"
  | "puppy"
  | "adult"
  | "senior"
  | "neutered"
  | "size-mini"
  | "size-small"
  | "size-medium"
  | "size-large"
  | "economy"
  | "standard"
  | "premium"
  | "super-premium";

export interface FunnelOption<S extends string> {
  slug: S;
  label: string;
  shortLabel?: string;
  description?: string;
  icon: IconKey;
}

export const SPECIES: FunnelOption<SpeciesSlug>[] = [
  { slug: "caes", label: "Cão", description: "Rações e petiscos para cachorros", icon: "dog" },
  { slug: "gatos", label: "Gato", description: "Rações, sachês e petiscos para gatos", icon: "cat" },
];

export const FOOD_TYPES: FunnelOption<FoodTypeSlug>[] = [
  { slug: "racao-seca", label: "Ração seca", description: "Preço por kg", icon: "dry" },
  { slug: "racao-umida", label: "Ração úmida", description: "Sachê, lata e patê", icon: "wet" },
  { slug: "petiscos", label: "Petiscos e snacks", description: "Bifinhos, ossinhos, dental", icon: "snack" },
  {
    slug: "dietas-veterinarias",
    label: "Dietas veterinárias",
    description: "Uso sob orientação veterinária",
    icon: "vet",
  },
];

export const LIFE_STAGES: (FunnelOption<LifeStageSlug> & { species: SpeciesSlug[] })[] = [
  { slug: "filhote", label: "Filhote", icon: "puppy", species: ["caes", "gatos"] },
  { slug: "adulto", label: "Adulto", icon: "adult", species: ["caes", "gatos"] },
  { slug: "senior", label: "Sênior", icon: "senior", species: ["caes", "gatos"] },
  { slug: "castrado", label: "Castrado", icon: "neutered", species: ["gatos"] },
];

export const SIZES: FunnelOption<SizeSlug>[] = [
  { slug: "mini", label: "Mini", description: "até 5 kg", icon: "size-mini" },
  { slug: "pequeno", label: "Pequeno", description: "5 a 10 kg", icon: "size-small" },
  { slug: "medio", label: "Médio", description: "10 a 25 kg", icon: "size-medium" },
  { slug: "grande", label: "Grande/Gigante", shortLabel: "Grande", description: "acima de 25 kg", icon: "size-large" },
];

export const SEGMENTS: FunnelOption<SegmentSlug>[] = [
  { slug: "economica", label: "Econômica", icon: "economy" },
  { slug: "standard", label: "Standard", icon: "standard" },
  { slug: "premium", label: "Premium", icon: "premium" },
  { slug: "super-premium", label: "Super premium", description: "Premium especial", icon: "super-premium" },
];

export const REFINEMENTS: { slug: RefinementSlug; label: string }[] = [
  { slug: "sem-corante", label: "Sem corante" },
  { slug: "grain-free", label: "Grain free" },
  { slug: "light", label: "Light" },
  { slug: "pele-sensivel", label: "Pele sensível" },
];

export const PACKAGE_RANGES: { slug: PackageRangeSlug; label: string; min: number; max: number }[] = [
  { slug: "ate-3kg", label: "Até 3 kg", min: 0, max: 3000 },
  { slug: "3-10kg", label: "3 a 10 kg", min: 3000.01, max: 10000 },
  { slug: "acima-10kg", label: "Acima de 10 kg", min: 10000.01, max: Number.POSITIVE_INFINITY },
];

export const VET_DIET_WARNING = "Use sob orientação do médico-veterinário.";

export function labelFor<S extends string>(options: { slug: S; label: string }[], slug: S | undefined) {
  return options.find((o) => o.slug === slug)?.label;
}
