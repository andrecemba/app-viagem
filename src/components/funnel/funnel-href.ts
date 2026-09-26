import {
  buildFilterQuery,
  buildFunnelPath,
  STEP_PARAM,
  type FunnelDimension,
  type FunnelSelection,
  type OfferFilters,
} from "@/lib/funnel/filters";

export type QueryFilters = Pick<OfferFilters, "refinements" | "packageRange" | "storeSlugs" | "sort">;

export function funnelHref(selection: FunnelSelection, filters: QueryFilters, step?: FunnelDimension | "fim" | null) {
  const query = new URLSearchParams(buildFilterQuery(filters).slice(1));
  if (step) query.set("etapa", step === "fim" ? "fim" : STEP_PARAM[step]);
  const qs = query.toString();
  return `${buildFunnelPath(selection)}${qs ? `?${qs}` : ""}`;
}
