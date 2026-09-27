import { FOOD_TYPE_LABEL, LIFE_STAGE_LABEL, SIZE_LABEL, SPECIES_LABEL, formatGrams, productLabel, STATUS_LABEL } from "./labels";
import { pendingFields } from "./mutations";
import { normalizeText } from "./text";
import type { AdminProduct, PublicationStatus } from "./types";

/** Linha da tabela de produtos (dados já resolvidos para exibição). */
export interface ProductRow {
  id: string;
  label: string;
  brand: string | null;
  species: string | null;
  lifeStage: string | null;
  size: string | null;
  foodType: string | null;
  weightGrams: number | null;
  status: PublicationStatus;
  priceCount: number;
  bestPrice: number | null;
  pending: string[];
  verified: boolean;
  updatedAt: string;
}

export function buildRows(products: AdminProduct[]): ProductRow[] {
  return products.map((p) => {
    const prices = p.offers.filter((o) => o.available && o.price != null).map((o) => o.price!);
    return {
      id: p.id,
      label: productLabel(p),
      brand: p.brand,
      species: p.species,
      lifeStage: p.lifeStage,
      size: p.size,
      foodType: p.foodType,
      weightGrams: p.weightGrams,
      status: p.status,
      priceCount: prices.length,
      bestPrice: prices.length ? Math.min(...prices) : null,
      pending: pendingFields(p),
      verified: p.verified,
      updatedAt: p.updatedAt,
    };
  });
}

// ── Filtros ────────────────────────────────────────────────────────────

export const FILTER_DIMENSIONS = ["especie", "marca", "tipo", "idade", "porte", "estado", "precos", "dados"] as const;
export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

export const DIMENSION_LABEL: Record<FilterDimension, string> = {
  especie: "Espécie",
  marca: "Marca",
  tipo: "Tipo",
  idade: "Idade",
  porte: "Porte",
  estado: "Publicação",
  precos: "Preços",
  dados: "Dados",
};

export type ProductFilters = Partial<Record<FilterDimension, string[]>> & { q?: string };
export type ProductSort = "nome" | "marca" | "peso" | "atualizado";

function valuesOf(row: ProductRow, dim: FilterDimension): string[] {
  switch (dim) {
    case "especie":
      return [row.species ?? "__vazio"];
    case "marca":
      return [row.brand ?? "__vazio"];
    case "tipo":
      return [row.foodType ?? "__vazio"];
    case "idade":
      return [row.lifeStage ?? "__vazio"];
    case "porte":
      return row.species === "gatos" ? ["__nao_se_aplica"] : [row.size ?? "__vazio"];
    case "estado":
      return [row.status];
    case "precos":
      return [row.priceCount ? "com" : "sem"];
    case "dados":
      return [row.pending.length ? "pendente" : "completo", row.verified ? "conferido" : "nao_conferido"];
  }
}

const FIXED_LABEL: Partial<Record<FilterDimension, Record<string, string>>> = {
  precos: { com: "Com preço", sem: "Sem preço" },
  dados: { pendente: "Com pendências", completo: "Todos os tópicos preenchidos", conferido: "Conferido na embalagem", nao_conferido: "Ainda não conferido" },
};

export function optionLabel(dim: FilterDimension, value: string): string {
  if (value === "__vazio") return "Pendente de verificação";
  if (value === "__nao_se_aplica") return "Não se aplica (gatos)";
  const fixed = FIXED_LABEL[dim]?.[value];
  if (fixed) return fixed;
  switch (dim) {
    case "especie":
      return SPECIES_LABEL[value as keyof typeof SPECIES_LABEL] ?? value;
    case "tipo":
      return FOOD_TYPE_LABEL[value as keyof typeof FOOD_TYPE_LABEL] ?? value;
    case "idade":
      return LIFE_STAGE_LABEL[value as keyof typeof LIFE_STAGE_LABEL] ?? value;
    case "porte":
      return SIZE_LABEL[value as keyof typeof SIZE_LABEL] ?? value;
    case "estado":
      return STATUS_LABEL[value as PublicationStatus] ?? value;
    default:
      return value;
  }
}

function matchesQuery(row: ProductRow, q: string) {
  const text = normalizeText(row.label);
  return normalizeText(q)
    .split(" ")
    .filter(Boolean)
    .every((w) => text.includes(w));
}

export function matchesFilters(row: ProductRow, f: ProductFilters, ignore?: FilterDimension) {
  if (f.q && !matchesQuery(row, f.q)) return false;
  for (const dim of FILTER_DIMENSIONS) {
    if (dim === ignore) continue;
    const selected = f[dim];
    if (!selected?.length) continue;
    const values = valuesOf(row, dim);
    if (!selected.some((s) => values.includes(s))) return false;
  }
  return true;
}

export interface Facet {
  dim: FilterDimension;
  options: { value: string; label: string; count: number; selected: boolean }[];
}

export function computeFacets(rows: ProductRow[], f: ProductFilters): Facet[] {
  return FILTER_DIMENSIONS.map((dim) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!matchesFilters(row, f, dim)) continue;
      for (const v of new Set(valuesOf(row, dim))) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    for (const s of f[dim] ?? []) if (!counts.has(s)) counts.set(s, 0);
    const options = [...counts.entries()].map(([value, count]) => ({ value, label: optionLabel(dim, value), count, selected: Boolean(f[dim]?.includes(value)) }));
    options.sort((a, b) => {
      if (a.value.startsWith("__") !== b.value.startsWith("__")) return a.value.startsWith("__") ? 1 : -1;
      return a.label.localeCompare(b.label, "pt-BR");
    });
    return { dim, options };
  });
}

export function sortRows(rows: ProductRow[], sort: ProductSort, dir: "asc" | "desc") {
  const m = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "marca":
        return m * ((a.brand ?? "").localeCompare(b.brand ?? "", "pt-BR") || a.label.localeCompare(b.label, "pt-BR"));
      case "peso":
        return m * ((a.weightGrams ?? Infinity) - (b.weightGrams ?? Infinity));
      case "atualizado":
        return m * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      default:
        return m * a.label.localeCompare(b.label, "pt-BR");
    }
  });
}

type Params = Record<string, string | string[] | undefined>;

export function readProductFilters(params: Params): { filters: ProductFilters; sort: ProductSort; dir: "asc" | "desc" } {
  const filters: ProductFilters = {};
  for (const dim of FILTER_DIMENSIONS) {
    const raw = params[dim];
    // Um parâmetro por valor (?marca=A&marca=B): nomes podem conter vírgula.
    const list = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean);
    if (list.length) filters[dim] = list;
  }
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  if (q?.trim()) filters.q = q.trim();
  const sortRaw = Array.isArray(params.ordem) ? params.ordem[0] : params.ordem;
  const sort: ProductSort = (["nome", "marca", "peso", "atualizado"] as const).includes(sortRaw as ProductSort) ? (sortRaw as ProductSort) : "nome";
  const dir = (Array.isArray(params.dir) ? params.dir[0] : params.dir) === "desc" ? "desc" : "asc";
  return { filters, sort, dir };
}

export function productFiltersHref(filters: ProductFilters, sort: ProductSort, dir: "asc" | "desc", change?: { dim: FilterDimension; value: string }) {
  const next: ProductFilters = { ...filters };
  if (change) {
    const current = new Set(next[change.dim] ?? []);
    if (current.has(change.value)) current.delete(change.value);
    else current.add(change.value);
    next[change.dim] = [...current];
  }
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  for (const dim of FILTER_DIMENSIONS) for (const v of next[dim] ?? []) p.append(dim, v);
  if (sort !== "nome") p.set("ordem", sort);
  if (dir !== "asc") p.set("dir", dir);
  const qs = p.toString();
  return `/admin/produtos${qs ? `?${qs}` : ""}`;
}

export { formatGrams };
