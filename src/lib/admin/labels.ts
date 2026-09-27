import { formatGrams } from "@/lib/catalog/vocab";

import type { AdminProduct, PublicationStatus } from "./types";

export {
  FOOD_TYPE_LABEL,
  LIFE_STAGE_LABEL,
  NEED_LABEL,
  SIZE_LABEL,
  SPECIES_LABEL,
  formatGrams,
} from "@/lib/catalog/vocab";

export const STATUS_LABEL: Record<PublicationStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  oculto: "Oculto",
};

/** "Golden Fórmula Cães Adultos · Frango e Arroz · 15 kg" */
export function productLabel(p: Pick<AdminProduct, "brand" | "line" | "formula" | "flavor" | "weightGrams">): string {
  const name = [p.brand, p.line && p.line !== p.brand ? p.line : null, p.formula].filter(Boolean).join(" ") || "Produto sem nome";
  return [name, p.flavor, p.weightGrams ? formatGrams(p.weightGrams) : null].filter(Boolean).join(" · ");
}
