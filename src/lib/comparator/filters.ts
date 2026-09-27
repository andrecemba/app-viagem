import type { SizeSlug, SpeciesSlug } from "@/types/catalog";

import type { ComparatorItem, FoodKind } from "./types";

/** Um valor por dimensão; clicar de novo no mesmo valor remove o filtro. */
export interface FilterState {
  species?: SpeciesSlug;
  kind?: FoodKind;
  brand?: string;
  size?: SizeSlug;
  /** Peso exato da embalagem, em gramas. */
  weight?: number;
}

export type FilterKey = keyof FilterState;

export const FILTER_KEYS: FilterKey[] = ["species", "kind", "brand", "size", "weight"];

export type SortKey = "relevancia" | "marca" | "menor-preco" | "preco-kg";

/** Porte só existe para cães; embalagens sem porte informado servem para todos. */
function matchesSize(item: ComparatorItem, size: SizeSlug) {
  return item.species === "caes" && (item.sizes.length === 0 || item.sizes.includes(size));
}

export function matchesFilters(item: ComparatorItem, f: FilterState, ignore?: FilterKey): boolean {
  if (ignore !== "species" && f.species && item.species !== f.species) return false;
  if (ignore !== "kind" && f.kind && item.kind !== f.kind) return false;
  if (ignore !== "brand" && f.brand && item.brand.slug !== f.brand) return false;
  if (ignore !== "size" && f.size && !matchesSize(item, f.size)) return false;
  if (ignore !== "weight" && f.weight && item.netWeightGrams !== f.weight) return false;
  return true;
}

/** Quantas embalagens cada opção teria, mantendo os demais filtros (padrão de facetas). */
export function facetCounts(items: ComparatorItem[], f: FilterState, key: FilterKey): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1);
  for (const item of items) {
    if (!matchesFilters(item, f, key)) continue;
    if (key === "species") add(item.species);
    else if (key === "kind") add(item.kind);
    else if (key === "brand") add(item.brand.slug);
    else if (key === "weight") add(String(item.netWeightGrams));
    else if (key === "size" && item.species === "caes") {
      for (const s of item.sizes.length ? item.sizes : (["mini", "pequeno", "medio", "grande"] as const)) add(s);
    }
  }
  return counts;
}

export function unitPriceOf(item: ComparatorItem) {
  const perKg = item.format === "dry";
  const value = perKg ? (item.bestPrice / item.netWeightGrams) * 1000 : (item.bestPrice / item.netWeightGrams) * 100;
  return { value, label: perKg ? "/kg" : "/100 g" };
}

export function sortItems(items: ComparatorItem[], sort: SortKey, scores: Map<string, number>): ComparatorItem[] {
  const byIdentity = (a: ComparatorItem, b: ComparatorItem) =>
    a.brand.name.localeCompare(b.brand.name, "pt-BR") ||
    a.title.localeCompare(b.title, "pt-BR") ||
    a.flavor.localeCompare(b.flavor, "pt-BR") ||
    a.netWeightGrams - b.netWeightGrams;
  const list = [...items];
  switch (sort) {
    case "relevancia":
      return list.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || byIdentity(a, b));
    case "menor-preco":
      return list.sort((a, b) => a.bestPrice - b.bestPrice || byIdentity(a, b));
    case "preco-kg":
      return list.sort((a, b) => unitPriceOf(a).value - unitPriceOf(b).value || byIdentity(a, b));
    default:
      return list.sort(byIdentity);
  }
}

// ── URL ─────────────────────────────────────────────────────────────────

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export interface ComparatorUrlState {
  query: string;
  filters: FilterState;
  sort: SortKey | null;
  item: string | null;
}

export function readUrlState(params: Params): ComparatorUrlState {
  const species = first(params.especie);
  const kind = first(params.tipo);
  const size = first(params.porte);
  const weight = Number(first(params.peso));
  const sort = first(params.ordem);
  return {
    query: first(params.q) ?? "",
    filters: {
      species: species === "caes" || species === "gatos" ? species : undefined,
      kind: kind === "seca" || kind === "natural" || kind === "umida" || kind === "medicamentosa" ? kind : undefined,
      brand: first(params.marca) || undefined,
      size: size === "mini" || size === "pequeno" || size === "medio" || size === "grande" ? size : undefined,
      weight: Number.isFinite(weight) && weight > 0 ? weight : undefined,
    },
    sort: sort === "relevancia" || sort === "marca" || sort === "menor-preco" || sort === "preco-kg" ? sort : null,
    item: first(params.item) ?? null,
  };
}

export function writeUrlState(state: ComparatorUrlState): string {
  const p = new URLSearchParams();
  if (state.query.trim()) p.set("q", state.query.trim());
  if (state.filters.species) p.set("especie", state.filters.species);
  if (state.filters.kind) p.set("tipo", state.filters.kind);
  if (state.filters.brand) p.set("marca", state.filters.brand);
  if (state.filters.size) p.set("porte", state.filters.size);
  if (state.filters.weight) p.set("peso", String(state.filters.weight));
  if (state.sort) p.set("ordem", state.sort);
  if (state.item) p.set("item", state.item);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}
