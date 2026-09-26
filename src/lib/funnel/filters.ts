import {
  FOOD_TYPES,
  LIFE_STAGES,
  PACKAGE_RANGES,
  REFINEMENTS,
  SEGMENTS,
  SIZES,
  SPECIES,
} from "@/config/taxonomy";
import type {
  FoodTypeSlug,
  LifeStageSlug,
  PackageRangeSlug,
  RefinementSlug,
  SegmentSlug,
  SizeSlug,
  SpeciesSlug,
} from "@/types/catalog";

/** Seleção do funil: o caminho da URL guarda as etapas; a query guarda refinamentos e ordenação. */
export interface FunnelSelection {
  species?: SpeciesSlug;
  foodType?: FoodTypeSlug;
  lifeStage?: LifeStageSlug;
  size?: SizeSlug;
  segment?: SegmentSlug;
  brand?: string;
}

export type SortKey = "unitario" | "total";

export interface OfferFilters extends FunnelSelection {
  refinements?: RefinementSlug[];
  packageRange?: PackageRangeSlug;
  storeSlugs?: string[];
  sort?: SortKey;
}

export type FunnelDimension = keyof FunnelSelection;

const PATH_ORDER: FunnelDimension[] = ["species", "foodType", "lifeStage", "size", "segment", "brand"];

const vocab: Record<Exclude<FunnelDimension, "brand">, readonly string[]> = {
  species: SPECIES.map((o) => o.slug),
  foodType: FOOD_TYPES.map((o) => o.slug),
  lifeStage: LIFE_STAGES.map((o) => o.slug),
  size: SIZES.map((o) => o.slug),
  segment: SEGMENTS.map((o) => o.slug),
};

/**
 * Lê `/caes/racao-seca/adulto/medio/golden` → seleção. Cada segmento é
 * reconhecido pelo vocabulário, então etapas puladas simplesmente não aparecem.
 * Retorna null para URLs inválidas (segmento desconhecido, repetido ou fora de ordem).
 */
export function parseFunnelPath(segments: string[], brandSlugs: readonly string[]): FunnelSelection | null {
  const selection: FunnelSelection = {};
  let lastIndex = -1;
  for (const raw of segments) {
    const seg = decodeURIComponent(raw).toLowerCase();
    let dim: FunnelDimension | undefined = (Object.keys(vocab) as (keyof typeof vocab)[]).find((d) =>
      vocab[d].includes(seg),
    );
    if (!dim && brandSlugs.includes(seg)) dim = "brand";
    if (!dim) return null;
    const index = PATH_ORDER.indexOf(dim);
    if (index <= lastIndex) return null;
    lastIndex = index;
    (selection as Record<string, string>)[dim] = seg;
  }
  if (selection.size && selection.species !== "caes") return null;
  if (selection.lifeStage === "castrado" && selection.species !== "gatos") return null;
  return selection;
}

export function buildFunnelPath(selection: FunnelSelection): string {
  const parts = PATH_ORDER.map((d) => selection[d]).filter(Boolean);
  return parts.length ? `/${parts.join("/")}` : "/";
}

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v.join(",") : (v ?? "")).split(",").map((s) => s.trim()).filter(Boolean);

export function parseFilterParams(params: SearchParams): Omit<OfferFilters, FunnelDimension> {
  const refinementSlugs = REFINEMENTS.map((r) => r.slug) as string[];
  const packageSlugs = PACKAGE_RANGES.map((r) => r.slug) as string[];
  const emb = first(params.embalagem);
  const sort = first(params.ordem);
  return {
    refinements: list(params.filtros).filter((s) => refinementSlugs.includes(s)) as RefinementSlug[],
    packageRange: emb && packageSlugs.includes(emb) ? (emb as PackageRangeSlug) : undefined,
    storeSlugs: list(params.loja),
    sort: sort === "total" ? "total" : "unitario",
  };
}

export function buildFilterQuery(filters: Omit<OfferFilters, FunnelDimension>): string {
  const q = new URLSearchParams();
  if (filters.refinements?.length) q.set("filtros", filters.refinements.join(","));
  if (filters.packageRange) q.set("embalagem", filters.packageRange);
  if (filters.storeSlugs?.length) q.set("loja", filters.storeSlugs.join(","));
  if (filters.sort === "total") q.set("ordem", "total");
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Etapas do funil na ordem de exibição (porte só existe para cães). */
export function funnelSteps(selection: FunnelSelection): FunnelDimension[] {
  return PATH_ORDER.filter((d) => d !== "size" || selection.species === "caes");
}

/** Nome da etapa na query (`?etapa=fase`), usado quando o usuário pula ou volta etapas. */
export const STEP_PARAM: Record<FunnelDimension, string> = {
  species: "especie",
  foodType: "tipo",
  lifeStage: "fase",
  size: "porte",
  segment: "faixa",
  brand: "marca",
};

export const STEP_LABEL: Record<FunnelDimension, string> = {
  species: "Espécie",
  foodType: "Tipo de alimento",
  lifeStage: "Fase de vida",
  size: "Porte",
  segment: "Faixa",
  brand: "Marca",
};

/**
 * Etapa atual: a da query (`etapa`), se válida; senão, a primeira etapa depois
 * da última selecionada. `null` = funil concluído (só refinamentos).
 */
export function currentStep(selection: FunnelSelection, etapa: string | undefined): FunnelDimension | null {
  const steps = funnelSteps(selection);
  if (etapa === "fim") return null;
  const fromParam = steps.find((d) => STEP_PARAM[d] === etapa);
  if (fromParam && !selection[fromParam]) return fromParam;
  let lastSelected = -1;
  steps.forEach((d, i) => {
    if (selection[d]) lastSelected = i;
  });
  return steps[lastSelected + 1] ?? null;
}

/** Etapa seguinte a `dim` (para o botão "Todas" / pular). */
export function nextStepAfter(selection: FunnelSelection, dim: FunnelDimension): FunnelDimension | null {
  const steps = funnelSteps(selection);
  const i = steps.indexOf(dim);
  for (let j = i + 1; j < steps.length; j++) if (!selection[steps[j]]) return steps[j];
  return null;
}
