import { SIZE_OPTIONS } from "@/config/comparator";
import { formatWeight } from "@/lib/format";

import type { ComparatorItem } from "./types";

const STAGE_LABEL = { filhote: "Filhote", adulto: "Adulto", senior: "Sênior", castrado: "Castrado" } as const;

function joinPt(parts: string[]) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

export function speciesLabel(item: Pick<ComparatorItem, "species">) {
  return item.species === "caes" ? "Cachorro" : "Gato";
}

export function lifeStageLabel(item: Pick<ComparatorItem, "lifeStages">) {
  const stages = item.lifeStages;
  if (stages.includes("castrado")) return "Adulto castrado";
  const labels = stages.map((s) => STAGE_LABEL[s]);
  return joinPt(labels.map((l, i) => (i === 0 ? l : l.toLowerCase())));
}

export function sizeLabel(item: Pick<ComparatorItem, "species" | "sizes">) {
  if (item.species === "gatos") return "Não se aplica";
  if (!item.sizes.length) return "Todos os portes";
  const labels = SIZE_OPTIONS.filter((o) => item.sizes.includes(o.slug)).map((o) => o.label);
  return joinPt(labels.map((l, i) => (i === 0 ? l : l.toLowerCase())));
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
