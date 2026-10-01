import { productTopics } from "@/lib/catalog/topics";
import { formatWeight } from "@/lib/format";

import type { ComparatorItem } from "./types";

export function speciesLabel(item: Pick<ComparatorItem, "species">) {
  return item.species === "caes" ? "Cachorro" : "Gato";
}

/** "15 kg" ou, para caixas de sachês, "1,8 kg · 18 × 100 g". */
export function packageLabel(item: Pick<ComparatorItem, "netWeightGrams" | "unitCount">) {
  const total = formatWeight(item.netWeightGrams);
  if (!item.unitCount) return total;
  return `${total} · ${item.unitCount} × ${formatWeight(Math.round(item.netWeightGrams / item.unitCount))}`;
}

export function storeCountLabel(count: number) {
  return count === 1 ? "1 loja" : `${count} lojas`;
}

/** Tópicos da embalagem, no mesmo formato do cadastro do admin. */
export function itemTopics(item: ComparatorItem) {
  return productTopics({
    species: item.species,
    lifeStages: item.lifeStages,
    sizes: item.sizes,
    foodType: item.kind,
    flavor: item.flavor || null,
    weightGrams: item.netWeightGrams,
    unitCount: item.unitCount,
    needs: item.needs,
    kibbleSize: item.kibbleSize,
    vetNote: item.vetNote,
    gtin: item.gtin,
  });
}
