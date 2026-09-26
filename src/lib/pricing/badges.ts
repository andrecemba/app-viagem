import type { PricePoint } from "@/types/catalog";

export type OfferBadgeKind = "lowest30" | "drop" | "freeShipping";

export interface OfferBadge {
  kind: OfferBadgeKind;
  label: string;
}

/** Selos públicos. "Tem comissão" existe só no painel admin (Fase 3). */
export function computeOfferBadges(
  current: number,
  history: PricePoint[],
  freeShipping: boolean,
): OfferBadge[] {
  const badges: OfferBadge[] = [];
  if (history.length >= 2) {
    const previous = history[history.length - 2].price;
    const last30 = history.slice(-16).map((p) => p.price);
    const drop = previous > 0 ? (previous - current) / previous : 0;
    if (drop >= 0.02) badges.push({ kind: "drop", label: `Caiu ${Math.round(drop * 100)}%` });
    if (current <= Math.min(...last30) && history.length >= 8) {
      badges.push({ kind: "lowest30", label: "Menor preço em 30 dias" });
    }
  }
  if (freeShipping) badges.push({ kind: "freeShipping", label: "Frete grátis" });
  return badges;
}
