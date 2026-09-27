import { weightRangeOf } from "@/lib/catalog/vocab";
import type { ComparatorItem } from "@/lib/comparator/types";

import { snapshotOf } from "./sanitize";
import type { AnalyticsEvent } from "./types";

/**
 * Eventos FICTÍCIOS para ver a tela Dados funcionando antes de haver tráfego.
 * Gravados em arquivo separado e exibidos sempre com o selo "Demonstração".
 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function generateDemoEvents(items: ComparatorItem[], now = new Date(), days = 90): AnalyticsEvent[] {
  const rand = rng(20260927);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  // Popularidade desigual (poucas rações concentram a procura), como em catálogos reais.
  const ranked = [...items].sort((a, b) => a.id.localeCompare(b.id)).map((item, i) => ({ item, weight: 1 / (1 + i * 0.35) ** 1.1 }));
  ranked.sort(() => rand() - 0.5);
  const totalWeight = ranked.reduce((a, r) => a + r.weight, 0);
  const pickItem = () => {
    let x = rand() * totalWeight;
    for (const r of ranked) if ((x -= r.weight) <= 0) return r.item;
    return ranked[0].item;
  };
  const brandNames = [...new Set(items.map((i) => i.brand.name.toLowerCase()))];
  const extraTerms = ["golden 15kg", "ração gato castrado", "royal mini", "premier filhote", "sache gato", "racao natural", "pro plan", "ração light", "biofresh", "gran plus"];

  const events: AnalyticsEvent[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const dayStart = now.getTime() - d * 86400_000;
    const weekend = [0, 6].includes(new Date(dayStart).getDay());
    const visits = Math.round((18 + (days - d) * 0.25) * (weekend ? 1.3 : 1) * (0.8 + rand() * 0.4));
    for (let v = 0; v < visits; v++) {
      const at = (offset: number) => new Date(dayStart - Math.floor(rand() * 20 * 3600_000) + offset).toISOString();
      if (rand() < 0.7) {
        const q = rand() < 0.55 ? pick(brandNames) : pick(extraTerms);
        events.push({ at: at(0), type: "busca", q, results: q === "gran plus" && rand() < 0.5 ? 0 : 1 + Math.floor(rand() * 20) });
      }
      const item = pickItem();
      if (rand() < 0.5) events.push({ at: at(1000), type: "filtro", dim: "especie", value: item.species });
      if (rand() < 0.35) events.push({ at: at(2000), type: "filtro", dim: "marca", value: item.brand.name });
      if (rand() < 0.25) events.push({ at: at(2500), type: "filtro", dim: "peso", value: weightRangeOf(item.netWeightGrams) });
      if (rand() < 0.2) events.push({ at: at(3000), type: "filtro", dim: "tipo", value: item.kind });
      if (rand() < 0.15 && item.species === "caes") events.push({ at: at(3500), type: "filtro", dim: "porte", value: pick(item.sizes ?? ["medio"]) });
      events.push({ at: at(5000), type: "produto", ...snapshotOf(item) });
      if (rand() < 0.38) {
        const offers = item.offers.filter((o) => o.inStock);
        const offer = rand() < 0.65 ? offers[0] : pick(offers);
        if (offer) events.push({ at: at(9000), type: "clique", ...snapshotOf(item), store: offer.storeSlug, price: offer.price, hasLink: true });
      }
    }
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}
