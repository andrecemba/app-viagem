import { FILTER_SIZES, weightRangeOf, type FilterSize, type LifeStage, type Need, type Species, type WeightRange, WEIGHT_RANGES, NEEDS } from "@/lib/catalog/vocab";

import type { ComparatorItem, FoodKind } from "./types";

/**
 * Filtros do site. Espécie é escolha única (divide o catálogo ao meio);
 * as demais dimensões aceitam várias opções (OU dentro do grupo, E entre grupos).
 */
export interface FilterState {
  species?: Species;
  brand: string[];
  age: LifeStage[];
  size: FilterSize[];
  kind: FoodKind[];
  need: Need[];
  flavor: string[];
  weight: WeightRange[];
}

export type MultiKey = Exclude<keyof FilterState, "species">;
export type FilterKey = keyof FilterState;

export const MULTI_KEYS: MultiKey[] = ["brand", "age", "size", "kind", "need", "flavor", "weight"];

export const EMPTY_FILTERS: FilterState = { brand: [], age: [], size: [], kind: [], need: [], flavor: [], weight: [] };

export type SortKey = "relevancia" | "marca" | "menor-preco" | "preco-kg";

/** Valores de um item numa dimensão. */
export function valuesOf(item: ComparatorItem, key: FilterKey): string[] {
  switch (key) {
    case "species":
      return [item.species];
    case "brand":
      return [item.brand.slug];
    case "age":
      return item.lifeStages.includes("todas") ? ["filhote", "adulto", "senior"] : item.lifeStages;
    case "size":
      // Porte só existe para cães; sem porte informado = serve para todos.
      return item.species === "caes" ? (item.sizes ?? [...FILTER_SIZES]) : [];
    case "kind":
      return [item.kind];
    case "need":
      return item.needs;
    case "flavor":
      return item.flavor ? [item.flavor] : [];
    case "weight":
      return [weightRangeOf(item.netWeightGrams)];
  }
}

export function matchesFilters(item: ComparatorItem, f: FilterState, ignore?: FilterKey): boolean {
  if (ignore !== "species" && f.species && item.species !== f.species) return false;
  for (const key of MULTI_KEYS) {
    if (key === ignore || !f[key].length) continue;
    const values = valuesOf(item, key);
    if (!(f[key] as string[]).some((v) => values.includes(v))) return false;
  }
  return true;
}

/** Quantas embalagens cada opção teria, mantendo os demais filtros (padrão de facetas). */
export function facetCounts(items: ComparatorItem[], f: FilterState, key: FilterKey): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!matchesFilters(item, f, key)) continue;
    for (const v of new Set(valuesOf(item, key))) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

export function activeFilterCount(f: FilterState) {
  return MULTI_KEYS.reduce((n, k) => n + f[k].length, 0);
}

export function unitPriceOf(item: Pick<ComparatorItem, "bestPrice" | "netWeightGrams" | "kind">, price = item.bestPrice) {
  if (price == null) return null;
  const perKg = item.kind !== "umida";
  const value = perKg ? (price / item.netWeightGrams) * 1000 : (price / item.netWeightGrams) * 100;
  return { value, label: perKg ? "/kg" : "/100 g" };
}

export type PriceSignal =
  | { kind: "abaixo"; percent: number; average: number }
  | { kind: "normal"; percent: number; average: number }
  | { kind: "acima"; percent: number; average: number }
  | { kind: "sem-historico" };

/** Tolerância para chamar de "preço normal" (± 5% da média). */
export const NORMAL_BAND = 0.05;

/** Compara o menor preço de hoje com a média do menor preço nos últimos 30 dias. */
export function priceSignal(item: Pick<ComparatorItem, "bestPrice" | "avgPrice30d">): PriceSignal {
  if (item.bestPrice == null || item.avgPrice30d == null || item.avgPrice30d <= 0) return { kind: "sem-historico" };
  const diff = (item.bestPrice - item.avgPrice30d) / item.avgPrice30d;
  const percent = Math.round(Math.abs(diff) * 100);
  if (Math.abs(diff) < NORMAL_BAND) return { kind: "normal", percent, average: item.avgPrice30d };
  return { kind: diff < 0 ? "abaixo" : "acima", percent, average: item.avgPrice30d };
}

// ── Agrupamento por fórmula ─────────────────────────────────────────────

/** Uma fórmula + sabor com todas as suas embalagens (um cartão na tela). */
export interface ItemGroup {
  family: string;
  /** Embalagens que passam nos filtros, da menor para a maior. */
  items: ComparatorItem[];
  /** Todas as embalagens da família (para mostrar as demais como opção). */
  all: ComparatorItem[];
}

export function groupByFamily(matching: ComparatorItem[], catalog: ComparatorItem[]): ItemGroup[] {
  const allByFamily = new Map<string, ComparatorItem[]>();
  for (const i of catalog) allByFamily.set(i.family, [...(allByFamily.get(i.family) ?? []), i]);
  const groups = new Map<string, ComparatorItem[]>();
  for (const i of matching) groups.set(i.family, [...(groups.get(i.family) ?? []), i]);
  const byWeight = (a: ComparatorItem, b: ComparatorItem) => a.netWeightGrams - b.netWeightGrams;
  return [...groups.entries()].map(([family, items]) => ({
    family,
    items: items.sort(byWeight),
    all: [...(allByFamily.get(family) ?? items)].sort(byWeight),
  }));
}

/** Embalagem mostrada primeiro: a de menor preço por kg entre as que passam nos filtros. */
export function defaultItem(group: ItemGroup): ComparatorItem {
  const priced = group.items.filter((i) => i.bestPrice != null);
  if (!priced.length) return group.items[0];
  return priced.reduce((best, i) => (unitPriceOf(i)!.value < unitPriceOf(best)!.value ? i : best));
}

export function sortGroups(groups: ItemGroup[], sort: SortKey, scores: Map<string, number>): ItemGroup[] {
  const lead = new Map(groups.map((g) => [g.family, defaultItem(g)]));
  const byIdentity = (a: ItemGroup, b: ItemGroup) => {
    const x = lead.get(a.family)!;
    const y = lead.get(b.family)!;
    return x.brand.name.localeCompare(y.brand.name, "pt-BR") || x.title.localeCompare(y.title, "pt-BR") || x.flavor.localeCompare(y.flavor, "pt-BR");
  };
  const score = (g: ItemGroup) => Math.max(...g.items.map((i) => scores.get(i.id) ?? 0));
  const price = (g: ItemGroup) => lead.get(g.family)!.bestPrice ?? 1e9;
  const perKg = (g: ItemGroup) => unitPriceOf(lead.get(g.family)!)?.value ?? 1e9;
  const list = [...groups];
  switch (sort) {
    case "relevancia":
      return list.sort((a, b) => score(b) - score(a) || byIdentity(a, b));
    case "menor-preco":
      return list.sort((a, b) => price(a) - price(b) || byIdentity(a, b));
    case "preco-kg":
      return list.sort((a, b) => perKg(a) - perKg(b) || byIdentity(a, b));
    default:
      return list.sort(byIdentity);
  }
}

// ── URL ─────────────────────────────────────────────────────────────────

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export interface ComparatorUrlState {
  query: string;
  filters: FilterState;
  sort: SortKey | null;
}

const URL_KEYS: Record<MultiKey, string> = {
  brand: "marca",
  age: "idade",
  size: "porte",
  kind: "tipo",
  need: "indicacao",
  flavor: "sabor",
  weight: "peso",
};

const ALLOWED: Partial<Record<MultiKey, readonly string[]>> = {
  age: ["filhote", "adulto", "senior"],
  size: FILTER_SIZES,
  kind: ["seca", "natural", "umida", "medicamentosa"],
  need: NEEDS,
  weight: WEIGHT_RANGES.map((r) => r.slug),
};

export function readUrlState(params: Params): ComparatorUrlState {
  const species = first(params.especie);
  const sort = first(params.ordem);
  const filters: FilterState = { ...EMPTY_FILTERS, species: species === "caes" || species === "gatos" ? species : undefined };
  for (const key of MULTI_KEYS) {
    const allowed = ALLOWED[key];
    const values = [...new Set(list(params[URL_KEYS[key]]).map((v) => v.slice(0, 60)))].filter((v) => !allowed || allowed.includes(v));
    (filters[key] as string[]) = values;
  }
  return {
    query: first(params.q) ?? "",
    filters,
    sort: sort === "relevancia" || sort === "marca" || sort === "menor-preco" || sort === "preco-kg" ? sort : null,
  };
}

/** Parâmetros repetidos por valor (sabores podem ter vírgula). */
export function writeUrlState(state: ComparatorUrlState): string {
  const p = new URLSearchParams();
  if (state.query.trim()) p.set("q", state.query.trim());
  if (state.filters.species) p.set("especie", state.filters.species);
  for (const key of MULTI_KEYS) for (const v of state.filters[key]) p.append(URL_KEYS[key], v);
  if (state.sort) p.set("ordem", state.sort);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}
