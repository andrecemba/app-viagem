"use client";

import { useState } from "react";

import { CatIcon, DogIcon } from "@/components/icons/species-icons";
import { KIND_OPTIONS, SIZE_OPTIONS, SPECIES_OPTIONS } from "@/config/comparator";
import type { FilterKey, FilterState } from "@/lib/comparator/filters";
import type { ComparatorBrand } from "@/lib/comparator/types";
import { formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

import { BrandSwatch } from "./brand-swatch";

export interface FacetData {
  species: Map<string, number>;
  kind: Map<string, number>;
  brand: Map<string, number>;
  size: Map<string, number>;
  weight: Map<string, number>;
}

const BRANDS_COLLAPSED = 8;
const SIZE_ICON = { mini: 15, pequeno: 17, medio: 20, grande: 23 } as const;

/**
 * Filtros visuais, na ordem: espécie; tipo; marca; porte; peso do pacote.
 * Cada opção mostra quantas embalagens restam com os demais filtros aplicados.
 */
export function FilterBar({
  filters,
  facets,
  brands,
  boxWeights,
  onToggle,
}: {
  filters: FilterState;
  facets: FacetData;
  brands: ComparatorBrand[];
  /** Pesos que só existem em caixas de sachês/latas: aparecem apenas com o tipo "Úmida". */
  boxWeights: Set<number>;
  onToggle: <K extends FilterKey>(key: K, value: FilterState[K]) => void;
}) {
  const [showAllBrands, setShowAllBrands] = useState(false);

  const visibleBrands = brands
    .filter((b) => (facets.brand.get(b.slug) ?? 0) > 0 || filters.brand === b.slug)
    .sort((a, b) => (facets.brand.get(b.slug) ?? 0) - (facets.brand.get(a.slug) ?? 0) || a.name.localeCompare(b.name, "pt-BR"));
  const collapsedBrands = showAllBrands ? visibleBrands : visibleBrands.slice(0, BRANDS_COLLAPSED);
  if (filters.brand && !collapsedBrands.some((b) => b.slug === filters.brand)) {
    const selected = visibleBrands.find((b) => b.slug === filters.brand);
    if (selected) collapsedBrands.push(selected);
  }

  const weights = [...facets.weight.keys()]
    .map(Number)
    .filter((w) => filters.kind === "umida" || !boxWeights.has(w))
    .sort((a, b) => a - b);
  if (filters.weight && !weights.includes(filters.weight)) weights.push(filters.weight);

  return (
    <div className="divide-y border-y">
      <FilterGroup label="Espécie">
        {SPECIES_OPTIONS.map((o) => {
          const Icon = o.slug === "caes" ? DogIcon : CatIcon;
          return (
            <Option
              key={o.slug}
              selected={filters.species === o.slug}
              count={facets.species.get(o.slug) ?? 0}
              onClick={() => onToggle("species", o.slug)}
              className="min-w-36 py-2.5"
            >
              <Icon size={26} strokeWidth={1.4} />
              <span className="text-[0.9375rem] font-semibold">{o.label}</span>
            </Option>
          );
        })}
      </FilterGroup>

      <FilterGroup label="Tipo">
        {KIND_OPTIONS.map((o) => (
          <Option
            key={o.slug}
            selected={filters.kind === o.slug}
            count={facets.kind.get(o.slug) ?? 0}
            onClick={() => onToggle("kind", o.slug)}
            className="items-start"
          >
            <span className="flex flex-col text-left">
              <span className="font-semibold">{o.label}</span>
              <span className="text-[0.6875rem] leading-tight opacity-70">{o.hint}</span>
            </span>
          </Option>
        ))}
      </FilterGroup>

      <FilterGroup
        label="Marca"
        action={
          visibleBrands.length > BRANDS_COLLAPSED && (
            <button
              type="button"
              onClick={() => setShowAllBrands((v) => !v)}
              className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              aria-expanded={showAllBrands}
            >
              {showAllBrands ? "Mostrar menos" : `Todas as ${visibleBrands.length} marcas`}
            </button>
          )
        }
      >
        {collapsedBrands.map((b) => (
          <Option
            key={b.slug}
            selected={filters.brand === b.slug}
            count={facets.brand.get(b.slug) ?? 0}
            onClick={() => onToggle("brand", b.slug)}
            className="pl-1.5"
          >
            <BrandSwatch brand={b} size={26} />
            <span className="font-semibold whitespace-nowrap">{b.name}</span>
          </Option>
        ))}
        {!visibleBrands.length && <p className="py-2 text-sm text-muted-foreground">Nenhuma marca com os filtros atuais.</p>}
      </FilterGroup>

      <FilterGroup label="Porte" note={filters.species === "gatos" ? "Não se aplica a gatos" : "Para cachorros"}>
        {SIZE_OPTIONS.map((o) => (
          <Option
            key={o.slug}
            selected={filters.size === o.slug}
            count={filters.species === "gatos" ? 0 : (facets.size.get(o.slug) ?? 0)}
            onClick={() => onToggle("size", o.slug)}
          >
            <span className="flex w-6 justify-center" aria-hidden>
              <DogIcon size={SIZE_ICON[o.slug]} strokeWidth={1.5} />
            </span>
            <span className="flex flex-col text-left">
              <span className="font-semibold">{o.label}</span>
              <span className="text-[0.6875rem] leading-tight opacity-70">{o.hint}</span>
            </span>
          </Option>
        ))}
      </FilterGroup>

      <FilterGroup label="Peso do pacote">
        {weights.map((w) => (
          <Option
            key={w}
            selected={filters.weight === w}
            count={facets.weight.get(String(w)) ?? 0}
            onClick={() => onToggle("weight", w)}
            className="px-3"
          >
            <span className="font-semibold tabular-nums whitespace-nowrap">{formatWeight(w)}</span>
          </Option>
        ))}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  label,
  note,
  action,
  children,
}: {
  label: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="grid gap-2 py-3.5 md:grid-cols-[9.5rem_1fr] md:gap-4">
      <div className="flex items-baseline justify-between gap-3 md:flex-col md:justify-start md:gap-1 md:pt-2">
        <p className="font-display text-[0.8125rem] font-semibold">{label}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        {action && <div className="md:hidden">{action}</div>}
      </div>
      <div className="min-w-0">
        {/* No celular, rolagem horizontal; no desktop, as opções quebram linha. */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 scrollbar-none md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {children}
        </div>
        {action && <div className="mt-2 hidden md:block">{action}</div>}
      </div>
    </div>
  );
}

function Option({
  selected,
  count,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  count: number;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const disabled = !selected && count === 0;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group inline-flex shrink-0 items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors",
        "focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-foreground hover:border-foreground/40",
        disabled && "cursor-not-allowed opacity-40 hover:border-border",
        className,
      )}
    >
      {children}
      <span
        className={cn(
          "ml-auto pl-1 text-xs tabular-nums",
          selected ? "text-background/70" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
