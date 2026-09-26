import Link from "next/link";
import { ArrowDownWideNarrow, Check, SlidersHorizontal } from "lucide-react";

import { PACKAGE_RANGES, REFINEMENTS } from "@/config/taxonomy";
import type { FunnelSelection } from "@/lib/funnel/filters";
import { cn } from "@/lib/utils";
import type { Store } from "@/types/catalog";

import { funnelHref, type QueryFilters } from "./funnel-href";

function toggle<T>(list: T[] | undefined, value: T) {
  const current = list ?? [];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50",
      )}
    >
      {active && <Check className="size-3" aria-hidden />}
      {children}
    </Link>
  );
}

/** Refinamentos (chips), filtro por loja e ordenação — tudo em links para ficar na URL. */
export function ResultsToolbar({
  selection,
  filters,
  stores,
  etapa,
  metricLabel,
}: {
  selection: FunnelSelection;
  filters: QueryFilters;
  stores: Store[];
  etapa?: string;
  metricLabel: string;
}) {
  const keepStep = etapa === "fim" ? "fim" : null;
  const href = (next: QueryFilters) => funnelHref(selection, next, keepStep);
  const sortUnit = filters.sort !== "total";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border bg-card p-1 text-xs font-bold" role="group" aria-label="Ordenar por">
          <ArrowDownWideNarrow className="mx-1.5 size-4 text-muted-foreground" aria-hidden />
          <Link
            href={href({ ...filters, sort: "unitario" })}
            scroll={false}
            aria-pressed={sortUnit}
            className={cn("rounded-lg px-3 py-1.5", sortUnit ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
          >
            Preço {metricLabel}
          </Link>
          <Link
            href={href({ ...filters, sort: "total" })}
            scroll={false}
            aria-pressed={!sortUnit}
            className={cn("rounded-lg px-3 py-1.5", !sortUnit ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
          >
            Preço total
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-muted-foreground">
          <SlidersHorizontal className="size-3.5" aria-hidden /> Filtros
        </span>
        {REFINEMENTS.map((r) => (
          <Chip
            key={r.slug}
            href={href({ ...filters, refinements: toggle(filters.refinements, r.slug) })}
            active={!!filters.refinements?.includes(r.slug)}
          >
            {r.label}
          </Chip>
        ))}
        {PACKAGE_RANGES.map((r) => (
          <Chip
            key={r.slug}
            href={href({ ...filters, packageRange: filters.packageRange === r.slug ? undefined : r.slug })}
            active={filters.packageRange === r.slug}
          >
            {r.label}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="inline-flex shrink-0 items-center text-xs font-bold text-muted-foreground">Lojas</span>
        {stores.map((s) => (
          <Chip
            key={s.slug}
            href={href({ ...filters, storeSlugs: toggle(filters.storeSlugs, s.slug) })}
            active={!!filters.storeSlugs?.includes(s.slug)}
          >
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}
