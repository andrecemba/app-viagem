import type { FoodKind } from "@/lib/comparator/types";
import type { SizeSlug, SpeciesSlug } from "@/types/catalog";

/**
 * Vocabulário do comparador (home). A ordem dos arrays é a ordem dos filtros na tela.
 */

export const SPECIES_OPTIONS: { slug: SpeciesSlug; label: string; plural: string }[] = [
  { slug: "caes", label: "Cachorro", plural: "cachorros" },
  { slug: "gatos", label: "Gato", plural: "gatos" },
];

export const KIND_OPTIONS: { slug: FoodKind; label: string; hint: string }[] = [
  { slug: "seca", label: "Ração seca", hint: "Linhas tradicionais" },
  { slug: "natural", label: "Natural", hint: "Linhas naturais, sem corantes" },
  { slug: "umida", label: "Úmida", hint: "Sachê, lata e patê" },
  { slug: "medicamentosa", label: "Medicamentosa", hint: "Sob orientação veterinária" },
];

export const SIZE_OPTIONS: { slug: SizeSlug; label: string; hint: string }[] = [
  { slug: "mini", label: "Mini", hint: "até 5 kg" },
  { slug: "pequeno", label: "Pequeno", hint: "5 a 10 kg" },
  { slug: "medio", label: "Médio", hint: "10 a 25 kg" },
  { slug: "grande", label: "Grande", hint: "acima de 25 kg" },
];

/**
 * Marcas cujas linhas o varejo classifica como "ração natural" (sem corantes e
 * aromatizantes artificiais). Ajustar quando o catálogo real tiver esse atributo.
 */
export const NATURAL_BRANDS = new Set(["guabi-natural", "formula-natural", "biofresh", "farmina-nd"]);

export const SEARCH_EXAMPLES = ["Golden frango 15 kg", "Royal Mini", "ração gato castrado"];

export const REGION_LABEL = "Curitiba e região";
