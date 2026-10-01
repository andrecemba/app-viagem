import Link from "next/link";
import { X } from "lucide-react";

import {
  DIMENSION_LABEL,
  productFiltersHref,
  type Facet,
  type FilterDimension,
  type ProductFilters,
  type ProductSort,
} from "@/lib/admin/product-list";
import { cn } from "@/lib/utils";

const COLLAPSED_BY_DEFAULT: FilterDimension[] = ["origem"];
const MAX_VISIBLE = 8;

/**
 * Filtros em grupos recolhíveis (<details>), sem JavaScript: cada opção é um
 * link que liga/desliga o valor na URL. Contagem = produtos que restariam.
 */
export function FiltersSidebar({ facets, filters, sort, dir }: { facets: Facet[]; filters: ProductFilters; sort: ProductSort; dir: "asc" | "desc" }) {
  return (
    <div className="divide-y text-sm">
      {facets.map((facet) => {
        const selectedCount = facet.options.filter((o) => o.selected).length;
        const open = selectedCount > 0 || !COLLAPSED_BY_DEFAULT.includes(facet.dim);
        const visible = facet.options.length > MAX_VISIBLE ? facet.options.filter((o, i) => i < MAX_VISIBLE || o.selected) : facet.options;
        const hidden = facet.options.filter((o) => !visible.includes(o));
        return (
          <details key={facet.dim} open={open} className="group py-2.5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded py-1 font-medium select-none">
              <span>
                {DIMENSION_LABEL[facet.dim]}
                {selectedCount > 0 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({selectedCount})</span>}
              </span>
              <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <ul className="mt-1.5 space-y-0.5">
              {visible.map((o) => (
                <Option key={o.value} facet={facet} option={o} filters={filters} sort={sort} dir={dir} />
              ))}
            </ul>
            {hidden.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer list-none py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Mostrar mais {hidden.length}
                </summary>
                <ul className="space-y-0.5">
                  {hidden.map((o) => (
                    <Option key={o.value} facet={facet} option={o} filters={filters} sort={sort} dir={dir} />
                  ))}
                </ul>
              </details>
            )}
          </details>
        );
      })}
    </div>
  );
}

function Option({
  facet,
  option,
  filters,
  sort,
  dir,
}: {
  facet: Facet;
  option: Facet["options"][number];
  filters: ProductFilters;
  sort: ProductSort;
  dir: "asc" | "desc";
}) {
  const disabled = option.count === 0 && !option.selected;
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border",
          option.selected ? "border-foreground bg-foreground text-background" : "border-input bg-card",
        )}
      >
        {option.selected && (
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m2.5 6 2.5 2.5 4.5-5" />
          </svg>
        )}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", option.selected && "font-medium")}>{option.label}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>
    </>
  );
  return (
    <li>
      {disabled ? (
        <span className="flex items-center gap-2 rounded px-1 py-1 opacity-40" aria-disabled>
          {content}
        </span>
      ) : (
        <Link
          href={productFiltersHref(filters, sort, dir, { dim: facet.dim, value: option.value })}
          scroll={false}
          role="checkbox"
          aria-checked={option.selected}
          className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted"
        >
          {content}
        </Link>
      )}
    </li>
  );
}

export function AppliedFilters({ facets, filters, sort, dir }: { facets: Facet[]; filters: ProductFilters; sort: ProductSort; dir: "asc" | "desc" }) {
  const applied = facets.flatMap((f) => f.options.filter((o) => o.selected).map((o) => ({ dim: f.dim, ...o })));
  if (!applied.length && !filters.q) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">Filtros aplicados:</span>
      {filters.q && (
        <Link href={productFiltersHref({ ...filters, q: undefined }, sort, dir)} className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 hover:border-foreground/40">
          Busca: “{filters.q}” <X className="size-3" aria-hidden />
          <span className="sr-only">remover</span>
        </Link>
      )}
      {applied.map((a) => (
        <Link
          key={`${a.dim}:${a.value}`}
          href={productFiltersHref(filters, sort, dir, { dim: a.dim, value: a.value })}
          scroll={false}
          className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 hover:border-foreground/40"
        >
          <span className="text-muted-foreground">{DIMENSION_LABEL[a.dim]}:</span> {a.label} <X className="size-3" aria-hidden />
          <span className="sr-only">remover</span>
        </Link>
      ))}
      <Link href="/admin/produtos" className="ml-1 font-medium underline underline-offset-4">
        Limpar filtros
      </Link>
    </div>
  );
}
