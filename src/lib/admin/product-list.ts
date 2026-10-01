import { SPECIES_LABEL } from "@/lib/catalog/vocab";
import type { AlertKind } from "@/lib/domain/alerts";
import { normalizeText } from "@/lib/domain/validation";

/** Linha da tabela de produtos do painel (dados já resolvidos). */
export interface ProductRow {
  id: number;
  label: string;
  brand: string;
  species: string;
  weightGrams: number;
  active: boolean;
  isDemo: boolean;
  offerCount: number;
  pricedCount: number;
  bestPrice: number | null;
  alertKinds: AlertKind[];
  gtin: string | null;
  updatedAt: string;
}

export const FILTER_DIMENSIONS = ["especie", "marca", "estado", "ofertas", "alertas", "origem"] as const;
export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

export const DIMENSION_LABEL: Record<FilterDimension, string> = {
  especie: "Espécie",
  marca: "Marca",
  estado: "Situação",
  ofertas: "Ofertas",
  alertas: "Alertas",
  origem: "Origem do cadastro",
};

export type ProductFilters = Partial<Record<FilterDimension, string[]>> & { q?: string };
export type ProductSort = "nome" | "marca" | "peso" | "atualizado";

function valuesOf(row: ProductRow, dim: FilterDimension): string[] {
  switch (dim) {
    case "especie":
      return [row.species];
    case "marca":
      return [row.brand];
    case "estado":
      return [row.active ? "ativo" : "desativado"];
    case "ofertas":
      return [row.offerCount === 0 ? "sem" : row.pricedCount === 0 ? "sem_preco" : "com"];
    case "alertas":
      return [row.alertKinds.length ? "com" : "sem"];
    case "origem":
      return [row.isDemo ? "exemplo" : "real"];
  }
}

const FIXED: Partial<Record<FilterDimension, Record<string, string>>> = {
  especie: SPECIES_LABEL,
  estado: { ativo: "Ativo", desativado: "Desativado" },
  ofertas: { com: "Com preço", sem_preco: "Ofertas sem preço", sem: "Sem ofertas" },
  alertas: { com: "Com alertas", sem: "Sem alertas" },
  origem: { real: "Cadastro real", exemplo: "Exemplo (demonstração)" },
};

export function matchesFilters(row: ProductRow, f: ProductFilters, ignore?: FilterDimension) {
  if (f.q) {
    const text = normalizeText(`${row.label} ${row.gtin ?? ""}`);
    if (!normalizeText(f.q).split(" ").every((w) => text.includes(w))) return false;
  }
  for (const dim of FILTER_DIMENSIONS) {
    if (dim === ignore || !f[dim]?.length) continue;
    const values = valuesOf(row, dim);
    if (!f[dim]!.some((v) => values.includes(v))) return false;
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
    for (const r of rows) if (matchesFilters(r, f, dim)) for (const v of valuesOf(r, dim)) counts.set(v, (counts.get(v) ?? 0) + 1);
    for (const s of f[dim] ?? []) if (!counts.has(s)) counts.set(s, 0);
    const options = [...counts.entries()]
      .map(([value, count]) => ({ value, label: FIXED[dim]?.[value] ?? value, count, selected: Boolean(f[dim]?.includes(value)) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    return { dim, options };
  });
}

export function sortRows(rows: ProductRow[], sort: ProductSort, dir: "asc" | "desc") {
  const m = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "marca":
        return m * (a.brand.localeCompare(b.brand, "pt-BR") || a.label.localeCompare(b.label, "pt-BR"));
      case "peso":
        return m * (a.weightGrams - b.weightGrams);
      case "atualizado":
        return m * a.updatedAt.localeCompare(b.updatedAt);
      default:
        return m * a.label.localeCompare(b.label, "pt-BR");
    }
  });
}

type Params = Record<string, string | string[] | undefined>;

export function readProductFilters(params: Params) {
  const filters: ProductFilters = {};
  for (const dim of FILTER_DIMENSIONS) {
    const raw = params[dim];
    const list = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean);
    if (list.length) filters[dim] = list;
  }
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  if (q?.trim()) filters.q = q.trim().slice(0, 100);
  const s = Array.isArray(params.ordem) ? params.ordem[0] : params.ordem;
  const sort: ProductSort = s === "marca" || s === "peso" || s === "atualizado" ? s : "nome";
  const dir: "asc" | "desc" = (Array.isArray(params.dir) ? params.dir[0] : params.dir) === "desc" ? "desc" : "asc";
  return { filters, sort, dir };
}

export function productFiltersHref(filters: ProductFilters, sort: ProductSort, dir: "asc" | "desc", change?: { dim: FilterDimension; value: string }) {
  const next: ProductFilters = { ...filters };
  if (change) {
    const cur = new Set(next[change.dim] ?? []);
    if (cur.has(change.value)) cur.delete(change.value);
    else cur.add(change.value);
    next[change.dim] = [...cur];
  }
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  for (const dim of FILTER_DIMENSIONS) for (const v of next[dim] ?? []) p.append(dim, v);
  if (sort !== "nome") p.set("ordem", sort);
  if (dir !== "asc") p.set("dir", dir);
  return `/admin/produtos${p.size ? `?${p}` : ""}`;
}
