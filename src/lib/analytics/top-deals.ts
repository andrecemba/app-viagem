import "server-only";

import { getDb } from "@/lib/db";
import { priceSignal } from "@/lib/comparator/filters";
import type { ComparatorItem } from "@/lib/comparator/types";

import { readEvents } from "./store";

export interface Deal {
  item: ComparatorItem;
  percent: number;
  average: number;
}

/**
 * "Top descontos do dia": entre as 10 rações mais procuradas nos últimos 30 dias
 * (visitas + cliques reais), as que estão hoje mais baratas que a própria média
 * de 30 dias. Sem procura suficiente, completa com as rações comparadas em mais
 * lojas (e o painel diz isso). Preço desatualizado não entra.
 */
export function getTopDeals(items: ComparatorItem[], now = new Date(), limit = 5) {
  const since = new Date(now.getTime() - 30 * 86400_000).toISOString();
  const score = new Map<string, number>();
  for (const e of readEvents(getDb(), "real", since)) {
    if (!e.productId || (e.type !== "produto" && e.type !== "clique")) continue;
    score.set(e.productId, (score.get(e.productId) ?? 0) + (e.type === "clique" ? 2 : 1));
  }
  const eligible = items.filter((i) => i.bestPrice != null && !i.bestPriceStale);
  const top = eligible.filter((i) => (score.get(i.id) ?? 0) > 0).sort((a, b) => score.get(b.id)! - score.get(a.id)!).slice(0, 10);
  const basedOnDemand = top.length === 10;
  if (!basedOnDemand) {
    const rest = eligible.filter((i) => !top.includes(i)).sort((a, b) => b.storeCount - a.storeCount || a.id.localeCompare(b.id));
    top.push(...rest.slice(0, 10 - top.length));
  }
  const deals: Deal[] = [];
  for (const item of top) {
    const s = priceSignal(item);
    if (s.kind === "abaixo") deals.push({ item, percent: s.percent, average: s.average });
  }
  deals.sort((a, b) => b.percent - a.percent);
  return { deals: deals.slice(0, limit), basedOnDemand };
}
