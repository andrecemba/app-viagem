import {
  FILTER_SIZES,
  FOOD_TYPE_LABEL,
  formatGrams,
  LIFE_STAGE_LABEL,
  NEED_LABEL,
  SIZE_LABEL,
  SPECIES_LABEL,
  type FilterSize,
  type FoodType,
  type LifeStage,
  type Need,
  type Species,
} from "./vocab";

/** Dados de um produto necessários para montar os tópicos (admin e site usam o mesmo formato). */
export interface TopicSource {
  species: Species | null;
  lifeStages: LifeStage[];
  /** null = não informado; lista com os 4 portes = todos. */
  sizes: FilterSize[] | null;
  foodType: FoodType | null;
  flavor: string | null;
  weightGrams: number | null;
  unitCount: number | null;
  needs: Need[];
  kibbleSize: string | null;
  vetNote: string | null;
  gtin: string | null;
}

export interface ProductTopic {
  key: "para" | "porte" | "tipo" | "sabor" | "peso" | "indicacoes" | "grao" | "veterinario" | "gtin";
  label: string;
  /** null = dado não informado (o admin vê "Pendente de verificação"). */
  value: string | null;
}

function sizeText(sizes: FilterSize[] | null) {
  if (!sizes) return null;
  if (sizes.length === 0 || sizes.length === FILTER_SIZES.length) return SIZE_LABEL.todos;
  const labels = sizes.map((s) => SIZE_LABEL[s].toLowerCase());
  const text = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} e ${labels.at(-1)}` : labels[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Tópicos exibidos no cartão e na página do produto, na ordem em que a pessoa
 * confere a embalagem: para quem, porte, tipo, sabor, peso, indicações.
 */
export function productTopics(p: TopicSource): ProductTopic[] {
  const stages = p.lifeStages.map((s) => LIFE_STAGE_LABEL[s].toLowerCase());
  const para = p.species ? [SPECIES_LABEL[p.species], stages.join(" e ")].filter(Boolean).join(" ") : null;
  const topics: ProductTopic[] = [
    { key: "para", label: "Para", value: para && stages.length ? para : para ? `${para} · idade não informada` : null },
  ];
  if (p.species !== "gatos") topics.push({ key: "porte", label: "Porte", value: sizeText(p.sizes) });
  topics.push(
    { key: "tipo", label: "Tipo", value: p.foodType ? FOOD_TYPE_LABEL[p.foodType] : null },
    { key: "sabor", label: "Sabor", value: p.flavor || null },
    {
      key: "peso",
      label: "Peso",
      value: p.weightGrams
        ? p.unitCount && p.unitCount > 1
          ? `${formatGrams(p.weightGrams)} (${p.unitCount} unidades de ${formatGrams(Math.round(p.weightGrams / p.unitCount))})`
          : formatGrams(p.weightGrams)
        : null,
    },
    { key: "indicacoes", label: "Indicações", value: p.needs.length ? p.needs.map((n) => NEED_LABEL[n]).join(" · ") : null },
    { key: "grao", label: "Tamanho do grão", value: p.kibbleSize || null },
  );
  if (p.foodType === "medicamentosa" || p.vetNote) {
    topics.push({
      key: "veterinario",
      label: "Uso veterinário",
      value: p.vetNote ? `${p.vetNote}. Use só com orientação do veterinário.` : "Use só com orientação do veterinário.",
    });
  }
  topics.push({ key: "gtin", label: "Código de barras", value: p.gtin || null });
  return topics;
}
