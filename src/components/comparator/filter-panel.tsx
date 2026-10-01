"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { BRANDS_VISIBLE } from "@/config/comparator";
import { FILTER_SIZES, FOOD_TYPE_LABEL, LIFE_STAGE_LABEL, NEED_LABEL, NEEDS, SIZE_LABEL, WEIGHT_RANGES } from "@/lib/catalog/vocab";
import { normalize } from "@/lib/comparator/search";
import type { FilterState, MultiKey } from "@/lib/comparator/filters";
import type { ComparatorBrand } from "@/lib/comparator/types";
import { cn } from "@/lib/utils";

import { BrandSwatch } from "./brand-swatch";

export type Facets = Record<MultiKey, Map<string, number>>;

const SIZE_HINT: Record<(typeof FILTER_SIZES)[number], string> = {
  mini: "até 5 kg",
  pequeno: "5 a 10 kg",
  medio: "10 a 25 kg",
  grande: "acima de 25 kg",
};

/**
 * Painel de filtros (barra lateral no computador, painel deslizante no celular).
 * Ordem = ordem de decisão: marca, idade, porte, tipo, necessidade, sabor, peso.
 * Cada opção mostra quantas embalagens restariam; opções sem resultado ficam apagadas.
 */
export function FilterPanel({
  filters,
  facets,
  brands,
  onToggle,
  onPrice,
}: {
  filters: FilterState;
  facets: Facets;
  brands: ComparatorBrand[];
  onToggle: (key: MultiKey, value: string) => void;
  onPrice: (min: number | undefined, max: number | undefined) => void;
}) {
  const option = (dim: MultiKey, value: string, label: string, hint?: string) => ({
    dim,
    value,
    label,
    hint,
    count: facets[dim].get(value) ?? 0,
    selected: (filters[dim] as string[]).includes(value),
  });

  const flavors = [...facets.flavor.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  for (const f of filters.flavor) if (!facets.flavor.has(f)) flavors.push([f, 0]);

  const lines = [...facets.line.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  for (const l of filters.line) if (!facets.line.has(l)) lines.push([l, 0]);

  return (
    <div className="divide-y">
      <BrandFilter brands={brands} filters={filters} counts={facets.brand} onToggle={(v) => onToggle("brand", v)} />
      <Group title="Linha" count={filters.line.length} defaultOpen={filters.line.length > 0 || filters.brand.length > 0}>
        <MoreList items={lines.map(([l]) => option("line", l, l))} onToggle={onToggle} visible={8} />
      </Group>
      <Group title="Idade" count={filters.age.length}>
        {(["filhote", "adulto", "senior"] as const).map((s) => (
          <Check key={s} {...option("age", s, LIFE_STAGE_LABEL[s])} onToggle={onToggle} />
        ))}
      </Group>
      {filters.species !== "gatos" && (
        <Group title="Porte do cachorro" count={filters.size.length}>
          {FILTER_SIZES.map((s) => (
            <Check key={s} {...option("size", s, SIZE_LABEL[s], SIZE_HINT[s])} onToggle={onToggle} />
          ))}
        </Group>
      )}
      <Group title="Tipo de alimento" count={filters.kind.length}>
        {(["seca", "natural", "umida", "medicamentosa"] as const).map((k) => (
          <Check key={k} {...option("kind", k, FOOD_TYPE_LABEL[k])} onToggle={onToggle} />
        ))}
      </Group>
      <Group title="Necessidade especial" count={filters.need.length} defaultOpen={filters.need.length > 0}>
        {NEEDS.map((n) => (
          <Check key={n} {...option("need", n, NEED_LABEL[n])} onToggle={onToggle} hideEmpty />
        ))}
      </Group>
      <Group title="Sabor" count={filters.flavor.length} defaultOpen={filters.flavor.length > 0}>
        <MoreList items={flavors.map(([f]) => option("flavor", f, f))} onToggle={onToggle} visible={8} />
      </Group>
      <Group title="Peso da embalagem" count={filters.weight.length}>
        {WEIGHT_RANGES.map((r) => (
          <Check key={r.slug} {...option("weight", r.slug, r.label, r.hint || undefined)} onToggle={onToggle} />
        ))}
      </Group>
      <Group title="Faixa de preço" count={filters.priceMin != null || filters.priceMax != null ? 1 : 0}>
        <PriceRange min={filters.priceMin} max={filters.priceMax} onChange={onPrice} />
      </Group>
    </div>
  );
}

function Group({ title, count, defaultOpen = true, children }: { title: string; count: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="py-3">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 py-1 text-left text-[0.9375rem] font-semibold"
        >
          <span>
            {title}
            {count > 0 && <span className="ml-1.5 text-sm font-normal text-muted-foreground">({count})</span>}
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </h3>
      {open && <div className="mt-2 space-y-0.5">{children}</div>}
    </section>
  );
}

interface OptionData {
  dim: MultiKey;
  value: string;
  label: string;
  hint?: string;
  count: number;
  selected: boolean;
}

function Check({ onToggle, hideEmpty, ...o }: OptionData & { onToggle: (key: MultiKey, value: string) => void; hideEmpty?: boolean }) {
  const disabled = o.count === 0 && !o.selected;
  if (disabled && hideEmpty) return null;
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted", disabled && "cursor-default opacity-40 hover:bg-transparent")}>
      <input
        type="checkbox"
        checked={o.selected}
        disabled={disabled}
        onChange={() => onToggle(o.dim, o.value)}
        className="size-4 shrink-0 rounded accent-foreground"
      />
      <span className={cn("min-w-0 flex-1", o.selected && "font-medium")}>
        {o.label}
        {o.hint && <span className="ml-1 text-xs text-muted-foreground">{o.hint}</span>}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">{o.count}</span>
    </label>
  );
}

function MoreList({ items, onToggle, visible }: { items: OptionData[]; onToggle: (key: MultiKey, value: string) => void; visible: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.filter((o, i) => i < visible || o.selected);
  return (
    <>
      {shown.map((o) => (
        <Check key={o.value} {...o} onToggle={onToggle} />
      ))}
      {items.length > shown.length && (
        <button type="button" onClick={() => setAll(true)} className="px-1.5 py-1 text-sm font-medium underline underline-offset-4">
          Ver todos ({items.length})
        </button>
      )}
    </>
  );
}

/**
 * Marcas em blocos com o selo (logotipo) e o nome. Campo de busca próprio,
 * porque o catálogo completo terá dezenas de marcas.
 */
function BrandFilter({
  brands,
  filters,
  counts,
  onToggle,
}: {
  brands: ComparatorBrand[];
  filters: FilterState;
  counts: Map<string, number>;
  onToggle: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(
    () =>
      [...brands].sort(
        (a, b) =>
          Number(filters.brand.includes(b.slug)) - Number(filters.brand.includes(a.slug)) ||
          Number((counts.get(b.slug) ?? 0) > 0) - Number((counts.get(a.slug) ?? 0) > 0) ||
          a.name.localeCompare(b.name, "pt-BR"),
      ),
    [brands, counts, filters.brand],
  );
  const q = normalize(query.trim());
  // Marcas sem nenhuma embalagem com os filtros atuais saem da lista (ex.: marcas só de cães ao escolher Gato).
  const relevant = sorted.filter((b) => (counts.get(b.slug) ?? 0) > 0 || filters.brand.includes(b.slug));
  const matching = q ? relevant.filter((b) => normalize(b.name).split(/\s+/).some((w) => w.startsWith(q)) || normalize(b.name).includes(q)) : relevant;
  const shown = q || showAll ? matching : matching.slice(0, BRANDS_VISIBLE);

  return (
    <section className="pb-4">
      <h3 className="py-1 text-[0.9375rem] font-semibold">
        Marca
        {filters.brand.length > 0 && <span className="ml-1.5 text-sm font-normal text-muted-foreground">({filters.brand.length})</span>}
      </h3>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Buscar entre ${relevant.length} marcas`}
          aria-label="Buscar marca"
          className="h-9 w-full rounded-md border border-input bg-card pr-2 pl-8 text-sm outline-none focus:border-foreground [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-1.5" aria-label="Marcas">
        {shown.map((b) => {
          const count = counts.get(b.slug) ?? 0;
          const selected = filters.brand.includes(b.slug);
          const disabled = count === 0 && !selected;
          return (
            <li key={b.slug}>
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onToggle(b.slug)}
                className={cn(
                  "flex h-full w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left transition-colors",
                  selected ? "border-foreground bg-foreground/[0.04] ring-1 ring-foreground" : "hover:border-foreground/40",
                  disabled && "opacity-35 hover:border-border",
                )}
              >
                <BrandSwatch brand={b} size={22} />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] leading-tight font-medium">{b.name}</span>
                <span className="text-[0.6875rem] text-muted-foreground tabular-nums">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {matching.length === 0 && <p className="mt-2 text-sm text-muted-foreground">{q ? `Nenhuma marca com “${query}”.` : "Nenhuma marca com os filtros atuais."}</p>}
      {!q && !showAll && matching.length > BRANDS_VISIBLE && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-sm font-medium underline underline-offset-4">
          Ver todas as {matching.length} marcas
        </button>
      )}
    </section>
  );
}

/** Menor preço da embalagem entre dois valores (aplica ao sair do campo ou com Enter). */
function PriceRange({ min, max, onChange }: { min?: number; max?: number; onChange: (min: number | undefined, max: number | undefined) => void }) {
  const [lo, setLo] = useState(min != null ? String(min) : "");
  const [hi, setHi] = useState(max != null ? String(max) : "");
  const [prev, setPrev] = useState([min, max]);
  if (prev[0] !== min || prev[1] !== max) {
    setPrev([min, max]);
    setLo(min != null ? String(min) : "");
    setHi(max != null ? String(max) : "");
  }
  const parse = (v: string) => {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return v.trim() && Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const apply = () => onChange(parse(lo), parse(hi));
  const field = "h-9 w-full rounded-md border border-input bg-card pr-2 pl-8 text-sm outline-none focus:border-foreground";
  return (
    <form
      className="grid grid-cols-2 gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      {(
        [
          ["De", lo, setLo],
          ["Até", hi, setHi],
        ] as const
      ).map(([label, value, set]) => (
        <label key={label} className="space-y-1 text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="relative block">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2">R$</span>
            <input value={value} onChange={(e) => set(e.target.value)} onBlur={apply} inputMode="decimal" className={field} />
          </span>
        </label>
      ))}
    </form>
  );
}
