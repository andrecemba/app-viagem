"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KIND_OPTIONS, SEARCH_EXAMPLES, SIZE_OPTIONS, SPECIES_OPTIONS } from "@/config/comparator";
import {
  facetCounts,
  FILTER_KEYS,
  matchesFilters,
  sortItems,
  writeUrlState,
  type ComparatorUrlState,
  type FilterKey,
  type FilterState,
  type SortKey,
} from "@/lib/comparator/filters";
import { buildSearchIndex, searchItems, type SearchResult } from "@/lib/comparator/search";
import type { ComparatorBrand, ComparatorItem } from "@/lib/comparator/types";
import { formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

import { FilterBar, type FacetData } from "./filter-bar";
import { OffersSheet } from "./offers-sheet";
import { ProductCard } from "./product-card";

const PAGE_SIZE = 24;

const SORT_LABEL: Record<SortKey, string> = {
  relevancia: "Mais relevantes",
  marca: "Marca (A–Z)",
  "menor-preco": "Menor preço",
  "preco-kg": "Menor preço por kg",
};

export function Comparator({
  items,
  brands,
  initial,
  intro,
}: {
  items: ComparatorItem[];
  brands: ComparatorBrand[];
  initial: ComparatorUrlState;
  intro: React.ReactNode;
}) {
  const [query, setQuery] = useState(initial.query);
  const [filters, setFilters] = useState<FilterState>(initial.filters);
  const [sort, setSort] = useState<SortKey | null>(initial.sort);
  const [openSlug, setOpenSlug] = useState<string | null>(initial.item);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const index = useMemo(() => buildSearchIndex(items), [items]);
  const boxWeights = useMemo(() => {
    const loose = new Set(items.filter((i) => !i.unitCount).map((i) => i.netWeightGrams));
    return new Set(items.filter((i) => i.unitCount && !loose.has(i.netWeightGrams)).map((i) => i.netWeightGrams));
  }, [items]);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const search = useMemo(() => searchItems(index, deferredQuery), [index, deferredQuery]);

  const facets: FacetData = useMemo(
    () => ({
      species: facetCounts(search.items, filters, "species"),
      kind: facetCounts(search.items, filters, "kind"),
      brand: facetCounts(search.items, filters, "brand"),
      size: facetCounts(search.items, filters, "size"),
      weight: facetCounts(search.items, filters, "weight"),
    }),
    [search.items, filters],
  );

  const hasQuery = search.mode !== "all";
  const effectiveSort: SortKey = sort ?? (hasQuery ? "relevancia" : "marca");
  const results = useMemo(
    () => sortItems(search.items.filter((i) => matchesFilters(i, filters)), effectiveSort, search.scores),
    [search, filters, effectiveSort],
  );

  const openItem = openSlug ? (items.find((i) => i.slug === openSlug) ?? null) : null;
  const siblings = openItem
    ? items
        .filter((i) => i.family === openItem.family && i.id !== openItem.id)
        .sort((a, b) => a.netWeightGrams - b.netWeightGrams)
    : [];

  // Nova busca ou filtro volta para a primeira página de resultados.
  const [pageKey, setPageKey] = useState("");
  const currentKey = JSON.stringify([deferredQuery, filters, effectiveSort]);
  if (pageKey !== currentKey) {
    setPageKey(currentKey);
    setPageSize(PAGE_SIZE);
  }
  const visible = results.slice(0, pageSize);

  // A URL acompanha busca, filtros e item aberto (dá para compartilhar ou voltar depois).
  useEffect(() => {
    const qs = writeUrlState({ query: deferredQuery, filters, sort, item: openSlug });
    if (qs !== window.location.search) window.history.replaceState(null, "", `${window.location.pathname}${qs}`);
  }, [deferredQuery, filters, sort, openSlug]);

  const toggle = useCallback(<K extends FilterKey>(key: K, value: FilterState[K]) => {
    setFilters((prev) => {
      const next: FilterState = { ...prev, [key]: prev[key] === value ? undefined : value };
      // Porte é só para cachorros.
      if (key === "species" && next.species === "gatos") next.size = undefined;
      return next;
    });
  }, []);

  const activeFilters = FILTER_KEYS.filter((k) => filters[k] !== undefined);
  const clearFilters = () => setFilters({});
  const clearAll = () => {
    setFilters({});
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:pt-14 sm:pb-10">
          {intro}
          <form
            role="search"
            className="mt-7 max-w-3xl"
            onSubmit={(e) => {
              e.preventDefault();
              inputRef.current?.blur();
              resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <label htmlFor="busca" className="sr-only">
              Buscar ração por nome, marca, linha, tipo, sabor ou peso
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                ref={inputRef}
                id="busca"
                type="search"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busque por marca, linha, sabor ou peso"
                className="h-14 w-full rounded-lg border border-input bg-card pr-24 pl-12 text-base shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors outline-none placeholder:text-muted-foreground/80 focus:border-foreground focus:ring-[3px] focus:ring-ring/20 sm:h-16 sm:text-lg [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" aria-hidden /> Limpar
                </button>
              )}
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5 text-sm text-muted-foreground">
              <span className="mr-1">Exemplos:</span>
              {SEARCH_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="rounded-md border px-2.5 py-1 text-[0.8125rem] text-foreground/85 transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </p>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-baseline justify-between gap-4 pt-7 pb-3">
          <h2 className="font-display text-lg font-semibold">Filtrar</h2>
          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Limpar filtros ({activeFilters.length})
            </button>
          )}
        </div>
        <FilterBar filters={filters} facets={facets} brands={brands} boxWeights={boxWeights} onToggle={toggle} />

        <section ref={resultsRef} aria-labelledby="resultados" className="scroll-mt-20 pt-6">
          <SearchNotice search={search} query={deferredQuery} />

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="resultados" className="mr-1 font-display text-lg font-semibold" aria-live="polite">
                {results.length} {results.length === 1 ? "embalagem" : "embalagens"}
              </h2>
              {activeFilters.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key, filters[key])}
                  className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs font-medium hover:border-foreground/40"
                  aria-label={`Remover filtro ${filterLabel(key, filters, brands)}`}
                >
                  {filterLabel(key, filters, brands)}
                  <X className="size-3" aria-hidden />
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Ordenar por
              <select
                value={effectiveSort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground outline-none focus:border-foreground"
              >
                {(Object.keys(SORT_LABEL) as SortKey[])
                  .filter((k) => k !== "relevancia" || hasQuery)
                  .map((k) => (
                    <option key={k} value={k}>
                      {SORT_LABEL[k]}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {results.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((item) => (
                <li key={item.id} className="flex">
                  <div className="flex w-full [&>article]:w-full">
                    <ProductCard item={item} onOpen={(i) => setOpenSlug(i.slug)} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {results.length > visible.length && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Mostrando {visible.length} de {results.length} embalagens
              </p>
              <Button variant="outline" onClick={() => setPageSize((n) => n + PAGE_SIZE)}>
                Mostrar mais {Math.min(PAGE_SIZE, results.length - visible.length)}
              </Button>
            </div>
          )}
          {results.length === 0 && (
            <EmptyState
              search={search}
              items={search.items}
              filters={filters}
              brands={brands}
              onRemove={(key) => toggle(key, filters[key])}
              onClearFilters={clearFilters}
              onClearAll={clearAll}
            />
          )}
        </section>
      </div>

      <OffersSheet
        item={openItem}
        siblings={siblings}
        onOpenChange={(open) => !open && setOpenSlug(null)}
        onSelect={(i) => setOpenSlug(i.slug)}
      />
    </>
  );
}

function filterLabel(key: FilterKey, f: FilterState, brands: ComparatorBrand[]) {
  switch (key) {
    case "species":
      return SPECIES_OPTIONS.find((o) => o.slug === f.species)?.label ?? "";
    case "kind":
      return KIND_OPTIONS.find((o) => o.slug === f.kind)?.label ?? "";
    case "brand":
      return brands.find((b) => b.slug === f.brand)?.name ?? f.brand ?? "";
    case "size":
      return `Porte ${SIZE_OPTIONS.find((o) => o.slug === f.size)?.label.toLowerCase() ?? ""}`;
    case "weight":
      return f.weight ? formatWeight(f.weight) : "";
  }
}

function SearchNotice({ search, query }: { search: SearchResult; query: string }) {
  if (search.mode === "all") return null;
  const q = query.trim();
  const corrections = search.corrections.length > 0 && (
    <>
      {" "}
      Consideramos{" "}
      {search.corrections.map((c, i) => (
        <span key={c.typed}>
          {i > 0 && ", "}
          <span className="line-through decoration-muted-foreground/60">{c.typed}</span> →{" "}
          <strong className="font-semibold text-foreground">{c.suggestion}</strong>
        </span>
      ))}
      .
    </>
  );

  if (search.mode === "exact") {
    return (
      <p className="mb-4 text-sm text-muted-foreground">
        Resultados para <strong className="font-semibold text-foreground">“{q}”</strong>, do mais relevante ao menos
        relevante.{corrections}
      </p>
    );
  }

  if (search.mode === "closest") {
    const missing: string[] = [];
    if (search.unknownTerms.length) missing.push(`sem correspondência para “${search.unknownTerms.join("”, “")}”`);
    const w = search.weightGrams;
    if (w != null && !search.items.some((i) => i.netWeightGrams === w)) {
      missing.push(`nenhuma embalagem de ${formatWeight(w)} parecida`);
    }
    return (
      <div role="status" className="mb-5 border-l-2 border-foreground bg-muted px-4 py-3 text-sm">
        <p className="font-semibold">Não encontramos uma embalagem exata para “{q}”.</p>
        <p className="mt-0.5 text-muted-foreground">
          Mostrando os produtos mais próximos{missing.length ? ` (${missing.join("; ")})` : ""}.{corrections}
        </p>
      </div>
    );
  }
  return null;
}

function EmptyState({
  search,
  items,
  filters,
  brands,
  onRemove,
  onClearFilters,
  onClearAll,
}: {
  search: SearchResult;
  items: ComparatorItem[];
  filters: FilterState;
  brands: ComparatorBrand[];
  onRemove: (key: FilterKey) => void;
  onClearFilters: () => void;
  onClearAll: () => void;
}) {
  const active = FILTER_KEYS.filter((k) => filters[k] !== undefined);
  // Quais filtros, se removidos sozinhos, voltam a mostrar embalagens.
  const suggestions = active
    .map((key) => ({ key, count: items.filter((i) => matchesFilters(i, filters, key)).length }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
  // Nenhum filtro sozinho resolve: sugere manter só o primeiro (normalmente a espécie).
  const keepFirst =
    !suggestions.length && active.length > 1
      ? {
          key: active[0],
          count: items.filter((i) => matchesFilters(i, { [active[0]]: filters[active[0]] } as FilterState)).length,
        }
      : null;

  const noSearchMatch = search.mode === "none";
  return (
    <div className="rounded-lg border px-5 py-10 text-center sm:px-10">
      <h3 className="font-display text-lg font-semibold">
        {noSearchMatch ? "Nenhum produto parecido com a busca" : "Nenhuma embalagem com essa combinação"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {noSearchMatch
          ? "Confira a grafia ou tente só a marca e o peso, por exemplo “Golden 15 kg”."
          : "Remova um dos filtros para ver as embalagens disponíveis."}
      </p>
      {suggestions.length > 0 && (
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <li key={s.key}>
              <Button variant="outline" size="sm" onClick={() => onRemove(s.key)}>
                Remover “{filterLabel(s.key, filters, brands)}” · {s.count}{" "}
                {s.count === 1 ? "embalagem" : "embalagens"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {keepFirst && keepFirst.count > 0 && (
        <div className="mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              for (const key of active.slice(1)) onRemove(key);
            }}
          >
            Manter só “{filterLabel(keepFirst.key, filters, brands)}” · {keepFirst.count}{" "}
            {keepFirst.count === 1 ? "embalagem" : "embalagens"}
          </Button>
        </div>
      )}
      <div className={cn("mt-5 flex flex-wrap justify-center gap-2")}>
        {active.length > 0 && (
          <Button variant={suggestions.length || keepFirst ? "ghost" : "default"} size="sm" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
        {search.mode !== "all" && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            Limpar busca e filtros
          </Button>
        )}
      </div>
    </div>
  );
}
