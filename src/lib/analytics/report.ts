import { FOOD_TYPE_LABEL, formatGrams, SIZE_LABEL, SPECIES_LABEL, type DogSize, type FoodType, type Species } from "@/lib/catalog/vocab";

import type { AnalyticsEvent } from "./types";

export interface RankRow {
  key: string;
  label: string;
  /** Visitas à página do produto. */
  views: number;
  /** Cliques para as lojas. */
  clicks: number;
  /** Vezes que a opção foi escolhida no filtro. */
  filters: number;
}

export interface StoreRow {
  store: string;
  name: string;
  clicks: number;
  share: number;
  /** Soma dos preços das ofertas clicadas. */
  value: number;
  commissionRate: number | null;
  /** value × conversão × comissão; null se faltar taxa. */
  estimate: number | null;
}

export interface Report {
  from: string;
  to: string;
  totals: { clicks: number; views: number; searches: number; filters: number; clickedValue: number };
  clicksByDay: { date: string; clicks: number }[];
  stores: StoreRow[];
  estimate: { total: number | null; storesWithoutRate: string[]; conversionRate: number | null };
  products: (RankRow & { brand: string })[];
  brands: RankRow[];
  weights: RankRow[];
  kinds: RankRow[];
  dogSizes: RankRow[];
  species: RankRow[];
  terms: { q: string; count: number; zero: number }[];
  zeroResultTerms: { q: string; count: number }[];
}

function rank(rows: Map<string, RankRow>) {
  return [...rows.values()].sort((a, b) => b.views + b.clicks + b.filters - (a.views + a.clicks + a.filters) || a.label.localeCompare(b.label, "pt-BR"));
}

function bump(map: Map<string, RankRow>, key: string, label: string, field: "views" | "clicks" | "filters") {
  const row = map.get(key) ?? { key, label, views: 0, clicks: 0, filters: 0 };
  row[field]++;
  map.set(key, row);
}

const dayOf = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

/** Valores do filtro de peso vêm como faixa ("10-15kg"); das páginas, como peso exato. */
const WEIGHT_RANGE_LABEL: Record<string, string> = {
  "ate-1kg": "Até 1 kg",
  "1-3kg": "1 a 3 kg",
  "3-10kg": "3 a 10 kg",
  "10-15kg": "10 a 15 kg",
  "acima-15kg": "Acima de 15 kg",
};

export function buildReport(
  events: AnalyticsEvent[],
  opts: { from: Date; to: Date; conversionRate: number | null; commission: Record<string, number | null>; storeNames?: Record<string, string> },
): Report {
  const from = opts.from.toISOString();
  const to = opts.to.toISOString();
  const list = events.filter((e) => e.at >= from && e.at <= to);

  const products = new Map<string, RankRow & { brand: string }>();
  const brands = new Map<string, RankRow>();
  const weights = new Map<string, RankRow>();
  const kinds = new Map<string, RankRow>();
  const dogSizes = new Map<string, RankRow>();
  const species = new Map<string, RankRow>();
  const stores = new Map<string, { clicks: number; value: number }>();
  const terms = new Map<string, { count: number; zero: number }>();
  const clicksByDay = new Map<string, number>();
  const totals = { clicks: 0, views: 0, searches: 0, filters: 0, clickedValue: 0 };

  for (const e of list) {
    if (e.type === "produto" || e.type === "clique") {
      const field = e.type === "produto" ? "views" : "clicks";
      if (e.productId) {
        const row = products.get(e.productId) ?? { key: e.productId, label: e.productName ?? e.productId, brand: e.brand ?? "", views: 0, clicks: 0, filters: 0 };
        row[field]++;
        products.set(e.productId, row);
      }
      if (e.brand) bump(brands, e.brand, e.brand, field);
      if (e.weightGrams) bump(weights, `g:${e.weightGrams}`, formatGrams(e.weightGrams), field);
      if (e.kind) bump(kinds, e.kind, FOOD_TYPE_LABEL[e.kind as FoodType] ?? e.kind, field);
      if (e.species) bump(species, e.species, SPECIES_LABEL[e.species as Species] ?? e.species, field);
      for (const s of e.sizes ?? []) bump(dogSizes, s, SIZE_LABEL[s as DogSize] ?? s, field);
    }
    switch (e.type) {
      case "produto":
        totals.views++;
        break;
      case "clique": {
        totals.clicks++;
        totals.clickedValue += e.price ?? 0;
        const day = dayOf(e.at);
        clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1);
        if (e.store) {
          const s = stores.get(e.store) ?? { clicks: 0, value: 0 };
          s.clicks++;
          s.value += e.price ?? 0;
          stores.set(e.store, s);
        }
        break;
      }
      case "busca":
        if (e.q) {
          totals.searches++;
          const t = terms.get(e.q) ?? { count: 0, zero: 0 };
          t.count++;
          if (e.results === 0) t.zero++;
          terms.set(e.q, t);
        }
        break;
      case "filtro":
        totals.filters++;
        if (!e.value) break;
        if (e.dim === "marca") bump(brands, brands.get(e.value)?.key ?? e.value, e.value, "filters");
        else if (e.dim === "peso") bump(weights, `r:${e.value}`, WEIGHT_RANGE_LABEL[e.value] ?? e.value, "filters");
        else if (e.dim === "tipo") bump(kinds, e.value, FOOD_TYPE_LABEL[e.value as FoodType] ?? e.value, "filters");
        else if (e.dim === "porte") bump(dogSizes, e.value, SIZE_LABEL[e.value as DogSize] ?? e.value, "filters");
        else if (e.dim === "especie") bump(species, e.value, SPECIES_LABEL[e.value as Species] ?? e.value, "filters");
        break;
    }
  }

  // Dias sem clique aparecem com zero, para o gráfico não pular datas.
  const days: { date: string; clicks: number }[] = [];
  for (let t = new Date(dayOf(from) + "T12:00:00Z").getTime(); dayOf(new Date(t).toISOString()) <= dayOf(to); t += 86400_000) {
    const date = dayOf(new Date(t).toISOString());
    days.push({ date, clicks: clicksByDay.get(date) ?? 0 });
  }

  const storeRows: StoreRow[] = [...stores.entries()]
    .map(([store, s]) => {
      const commissionRate = opts.commission[store] ?? null;
      return {
        store,
        name: opts.storeNames?.[store] ?? store,
        clicks: s.clicks,
        share: totals.clicks ? s.clicks / totals.clicks : 0,
        value: Math.round(s.value * 100) / 100,
        commissionRate,
        estimate: commissionRate != null && opts.conversionRate != null ? Math.round(s.value * opts.conversionRate * commissionRate * 100) / 100 : null,
      };
    })
    .sort((a, b) => b.clicks - a.clicks || a.name.localeCompare(b.name, "pt-BR"));

  const withRate = storeRows.filter((s) => s.estimate != null);
  const termRows = [...terms.entries()].map(([q, t]) => ({ q, ...t })).sort((a, b) => b.count - a.count || a.q.localeCompare(b.q));

  return {
    from,
    to,
    totals: { ...totals, clickedValue: Math.round(totals.clickedValue * 100) / 100 },
    clicksByDay: days,
    stores: storeRows,
    estimate: {
      total: withRate.length ? Math.round(withRate.reduce((a, s) => a + s.estimate!, 0) * 100) / 100 : null,
      storesWithoutRate: storeRows.filter((s) => s.commissionRate == null).map((s) => s.name),
      conversionRate: opts.conversionRate,
    },
    products: [...products.values()].sort((a, b) => b.views - a.views || b.clicks - a.clicks || a.label.localeCompare(b.label, "pt-BR")),
    brands: rank(brands),
    weights: rank(weights),
    kinds: rank(kinds),
    dogSizes: rank(dogSizes),
    species: rank(species),
    terms: termRows,
    zeroResultTerms: termRows.filter((t) => t.zero > 0).map((t) => ({ q: t.q, count: t.zero })).sort((a, b) => b.count - a.count),
  };
}
