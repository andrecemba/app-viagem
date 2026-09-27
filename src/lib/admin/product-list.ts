import { normalizeText, productLabel } from "./alerts";
import {
  FOOD_TYPE_LABEL,
  LIFE_STAGE_LABEL,
  SEVERITY_ORDER,
  SIZE_LABEL,
  SPECIES_LABEL,
  STATUS_LABEL,
  formatGrams,
} from "./labels";
import type { AdminDb, AlertSeverity, PublicationStatus } from "./types";

/** Linha da tabela de produtos (dados já resolvidos para exibição). */
export interface ProductRow {
  id: string;
  label: string;
  brand: string | null;
  line: string | null;
  formula: string | null;
  flavor: string | null;
  species: string | null;
  lifeStage: string | null;
  size: string | null;
  weightGrams: number | null;
  foodType: string | null;
  status: PublicationStatus;
  storeIds: string[];
  offerCount: number;
  activeOfferCount: number;
  demoOffers: boolean;
  bestPrice: number | null;
  openAlerts: number;
  maxSeverity: AlertSeverity | null;
  pendingFields: number;
  imageMissing: boolean;
  updatedAt: string;
}

export function buildRows(db: AdminDb): ProductRow[] {
  return db.products.map((p) => {
    const offers = db.offers.filter((o) => o.productId === p.id);
    const active = offers.filter((o) => !o.hidden && o.fields.availability.value === "disponivel" && o.fields.price.value);
    const alerts = db.alerts.filter((a) => a.productId === p.id && a.status === "aberto");
    const maxSeverity = SEVERITY_ORDER.find((s) => alerts.some((a) => a.severity === s)) ?? null;
    const f = p.fields;
    return {
      id: p.id,
      label: productLabel(p),
      brand: f.brand.value,
      line: f.line.value,
      formula: f.formula.value,
      flavor: f.flavor.value,
      species: f.species.value,
      lifeStage: f.lifeStage.value,
      size: f.size.value,
      weightGrams: f.weightGrams.value,
      foodType: f.foodType.value,
      status: p.status,
      storeIds: [...new Set(offers.map((o) => o.storeId))],
      offerCount: offers.length,
      activeOfferCount: active.length,
      demoOffers: offers.some((o) => o.demo),
      bestPrice: active.length ? Math.min(...active.map((o) => o.fields.price.value!)) : null,
      openAlerts: alerts.length,
      maxSeverity,
      pendingFields: Object.values(f).filter((fs) => fs.verification === "pendente").length,
      imageMissing: !f.imageUrl.value,
      updatedAt: p.updatedAt,
    };
  });
}

// ── Filtros ────────────────────────────────────────────────────────────

export const FILTER_DIMENSIONS = [
  "especie",
  "marca",
  "tipo",
  "fase",
  "porte",
  "sabor",
  "peso",
  "loja",
  "estado",
  "alertas",
] as const;
export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

export const DIMENSION_LABEL: Record<FilterDimension, string> = {
  especie: "Espécie",
  marca: "Marca",
  tipo: "Tipo de ração",
  fase: "Fase da vida",
  porte: "Porte",
  sabor: "Sabor",
  peso: "Peso",
  loja: "Loja",
  estado: "Publicação",
  alertas: "Alertas",
};

export type ProductFilters = Partial<Record<FilterDimension, string[]>> & { q?: string };
export type ProductSort = "nome" | "marca" | "peso" | "alertas" | "atualizado";

const ALERT_BUCKETS = ["critica", "alta", "media", "baixa", "sem_alertas"] as const;
const ALERT_BUCKET_LABEL: Record<(typeof ALERT_BUCKETS)[number], string> = {
  critica: "Com alerta crítico",
  alta: "Com alerta alto",
  media: "Com alerta médio",
  baixa: "Só alertas baixos",
  sem_alertas: "Sem alertas",
};

/** Valores de cada linha numa dimensão (uma linha pode ter vários, ex.: lojas). */
function valuesOf(row: ProductRow, dim: FilterDimension): string[] {
  switch (dim) {
    case "especie":
      return row.species ? [row.species] : ["__vazio"];
    case "marca":
      return row.brand ? [row.brand] : ["__vazio"];
    case "tipo":
      return row.foodType ? [row.foodType] : ["__vazio"];
    case "fase":
      return row.lifeStage ? [row.lifeStage] : ["__vazio"];
    case "porte":
      return row.species === "gatos" ? ["__nao_se_aplica"] : row.size ? [row.size] : ["__vazio"];
    case "sabor":
      return row.flavor ? [row.flavor] : ["__vazio"];
    case "peso":
      return row.weightGrams ? [String(row.weightGrams)] : ["__vazio"];
    case "loja":
      return row.storeIds.length ? row.storeIds : ["__sem_ofertas"];
    case "estado":
      return [row.status];
    case "alertas":
      return [row.maxSeverity ?? "sem_alertas"];
  }
}

export function optionLabel(dim: FilterDimension, value: string, storeNames: Record<string, string>): string {
  if (value === "__vazio") return "Não informado";
  if (value === "__nao_se_aplica") return "Não se aplica (gatos)";
  if (value === "__sem_ofertas") return "Sem ofertas";
  switch (dim) {
    case "especie":
      return SPECIES_LABEL[value as keyof typeof SPECIES_LABEL] ?? value;
    case "tipo":
      return FOOD_TYPE_LABEL[value as keyof typeof FOOD_TYPE_LABEL] ?? value;
    case "fase":
      return LIFE_STAGE_LABEL[value as keyof typeof LIFE_STAGE_LABEL] ?? value;
    case "porte":
      return SIZE_LABEL[value as keyof typeof SIZE_LABEL] ?? value;
    case "peso":
      return formatGrams(Number(value));
    case "loja":
      return storeNames[value] ?? value;
    case "estado":
      return STATUS_LABEL[value as PublicationStatus] ?? value;
    case "alertas":
      return ALERT_BUCKET_LABEL[value as (typeof ALERT_BUCKETS)[number]] ?? value;
    default:
      return value;
  }
}

function matchesQuery(row: ProductRow, q: string) {
  const text = normalizeText([row.label, row.line, row.id].filter(Boolean).join(" "));
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

export function computeFacets(rows: ProductRow[], f: ProductFilters, storeNames: Record<string, string>): Facet[] {
  return FILTER_DIMENSIONS.map((dim) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!matchesFilters(row, f, dim)) continue;
      for (const v of new Set(valuesOf(row, dim))) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    // Opções selecionadas continuam visíveis mesmo com contagem zero.
    for (const s of f[dim] ?? []) if (!counts.has(s)) counts.set(s, 0);
    const options = [...counts.entries()].map(([value, count]) => ({
      value,
      label: optionLabel(dim, value, storeNames),
      count,
      selected: Boolean(f[dim]?.includes(value)),
    }));
    options.sort((a, b) => {
      if (dim === "peso") return (Number(a.value) || Infinity) - (Number(b.value) || Infinity);
      if (dim === "alertas") return ALERT_BUCKETS.indexOf(a.value as never) - ALERT_BUCKETS.indexOf(b.value as never);
      if (a.value.startsWith("__") !== b.value.startsWith("__")) return a.value.startsWith("__") ? 1 : -1;
      return a.label.localeCompare(b.label, "pt-BR");
    });
    return { dim, options };
  });
}

export function sortRows(rows: ProductRow[], sort: ProductSort, dir: "asc" | "desc") {
  const m = dir === "asc" ? 1 : -1;
  const sev = (r: ProductRow) => (r.maxSeverity ? 4 - SEVERITY_ORDER.indexOf(r.maxSeverity) : 0);
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "marca":
        return m * ((a.brand ?? "").localeCompare(b.brand ?? "", "pt-BR") || a.label.localeCompare(b.label, "pt-BR"));
      case "peso":
        return m * ((a.weightGrams ?? Infinity) - (b.weightGrams ?? Infinity));
      case "alertas":
        return m * (sev(a) - sev(b) || a.openAlerts - b.openAlerts);
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
    // Um parâmetro por valor (?sabor=A&sabor=B): sabores podem conter vírgula.
    const list = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean);
    if (list.length) filters[dim] = list;
  }
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  if (q?.trim()) filters.q = q.trim();
  const sortRaw = Array.isArray(params.ordem) ? params.ordem[0] : params.ordem;
  const sort: ProductSort = (["nome", "marca", "peso", "alertas", "atualizado"] as const).includes(sortRaw as ProductSort)
    ? (sortRaw as ProductSort)
    : "nome";
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
