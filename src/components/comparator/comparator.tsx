"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { CatIcon, DogIcon } from "@/components/icons/species-icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SEARCH_EXAMPLES } from "@/config/comparator";
import { track } from "@/lib/analytics/client";
import {
  FOOD_TYPE_LABEL,
  LIFE_STAGE_LABEL,
  NEED_LABEL,
  SIZE_LABEL,
  WEIGHT_RANGES,
  type Species,
} from "@/lib/catalog/vocab";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  facetCounts,
  groupByFamily,
  matchesFilters,
  MULTI_KEYS,
  sortGroups,
  writeUrlState,
  type ComparatorUrlState,
  type FilterState,
  type MultiKey,
  type SortKey,
} from "@/lib/comparator/filters";
import {
  buildSearchIndex,
  searchItems,
  type SearchResult,
} from "@/lib/comparator/search";
import type { ComparatorBrand, ComparatorItem } from "@/lib/comparator/types";
import { cn } from "@/lib/utils";

import { FamilyCard } from "./family-card";
import { FilterPanel, type Facets } from "./filter-panel";
import { SearchBox } from "./search-box";

const PAGE_SIZE = 18;

const SORT_LABEL: Record<SortKey, string> = {
  relevancia: "Mais relevantes",
  marca: "Marca (A–Z)",
  "menor-preco": "Menor preço",
  "preco-kg": "Menor preço por kg",
  recentes: "Atualização mais recente",
};

const TRACK_DIM: Record<MultiKey, string> = {
  brand: "marca",
  line: "linha",
  age: "idade",
  size: "porte",
  kind: "tipo",
  need: "indicacao",
  flavor: "sabor",
  weight: "peso",
};

/**
 * Comparador: 1) para quem (cachorro ou gato), 2) busca com sugestões,
 * 3) filtros na lateral, 4) um cartão por fórmula com os pesos dentro.
 */
export function Comparator({
  items,
  brands,
  initial,
  intro,
  aside,
  strip,
}: {
  items: ComparatorItem[];
  brands: ComparatorBrand[];
  initial: ComparatorUrlState;
  intro: React.ReactNode;
  /** Painel ao lado da busca (Top descontos). */
  aside?: React.ReactNode;
  /** Faixa entre o topo e os resultados (marcas populares, vistos recentemente). */
  strip?: React.ReactNode;
}) {
  const [query, setQuery] = useState(initial.query);
  const [filters, setFilters] = useState<FilterState>(initial.filters);
  const [sort, setSort] = useState<SortKey | null>(initial.sort);
  const [panelOpen, setPanelOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const index = useMemo(() => buildSearchIndex(items), [items]);
  const search = useMemo(
    () => searchItems(index, deferredQuery),
    [index, deferredQuery],
  );

  const facets: Facets = useMemo(
    () =>
      Object.fromEntries(
        MULTI_KEYS.map((k) => [k, facetCounts(search.items, filters, k)]),
      ) as Facets,
    [search.items, filters],
  );
  const speciesCounts = useMemo(
    () => facetCounts(search.items, filters, "species"),
    [search.items, filters],
  );

  const hasQuery = search.mode !== "all";
  const effectiveSort: SortKey = sort ?? (hasQuery ? "relevancia" : "marca");
  const matching = useMemo(
    () => search.items.filter((i) => matchesFilters(i, filters)),
    [search.items, filters],
  );
  const groups = useMemo(
    () =>
      sortGroups(groupByFamily(matching, items), effectiveSort, search.scores),
    [matching, items, effectiveSort, search.scores],
  );

  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [pageKey, setPageKey] = useState("");
  const currentKey = JSON.stringify([deferredQuery, filters, effectiveSort]);
  if (pageKey !== currentKey) {
    setPageKey(currentKey);
    setPageSize(PAGE_SIZE);
  }
  const visible = groups.slice(0, pageSize);

  // A URL acompanha busca e filtros (dá para compartilhar ou voltar depois).
  useEffect(() => {
    const qs = writeUrlState({ query: deferredQuery, filters, sort });
    if (qs !== window.location.search)
      window.history.replaceState(null, "", `${window.location.pathname}${qs}`);
  }, [deferredQuery, filters, sort]);

  // Busca conta nos relatórios quando a pessoa para de digitar.
  const resultCount = matching.length;
  useEffect(() => {
    const q = deferredQuery.trim();
    if (q.length < 2) return;
    const t = setTimeout(
      () => track({ type: "busca", q, results: resultCount }),
      1500,
    );
    return () => clearTimeout(t);
  }, [deferredQuery, resultCount]);

  const toggle = useCallback((key: MultiKey, value: string) => {
    setFilters((prev) => {
      const current = prev[key] as string[];
      const adding = !current.includes(value);
      if (adding) track({ type: "filtro", dim: TRACK_DIM[key], value });
      return {
        ...prev,
        [key]: adding
          ? [...current, value]
          : current.filter((v) => v !== value),
      };
    });
  }, []);

  const setSpecies = (species: Species | undefined) => {
    if (species) track({ type: "filtro", dim: "especie", value: species });
    setFilters((prev) => ({
      ...prev,
      species,
      size: species === "gatos" ? [] : prev.size,
    }));
  };

  const count = activeFilterCount(filters);
  const clearFilters = () =>
    setFilters((prev) => ({ ...EMPTY_FILTERS, species: prev.species }));
  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setQuery("");
    inputRef.current?.focus();
  };
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]));

  const setPrice = (priceMin: number | undefined, priceMax: number | undefined) => setFilters((prev) => ({ ...prev, priceMin, priceMax }));
  const panel = <FilterPanel filters={filters} facets={facets} brands={brands} onToggle={toggle} onPrice={setPrice} />;
  const packages = matching.length;

  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:pt-12 sm:pb-9 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <div className="min-w-0">
            {intro}
            <div className="mt-7 max-w-3xl">
              <SearchBox
                ref={inputRef}
                query={query}
                onQueryChange={setQuery}
                index={index}
                brands={brands}
                items={items}
                onPickBrand={(slug) => {
                  setQuery("");
                  if (!filters.brand.includes(slug)) toggle("brand", slug);
                  resultsRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                onSubmit={() => {
                  inputRef.current?.blur();
                  resultsRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              />
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
            </div>

            <fieldset className="mt-7">
              <legend className="text-sm font-semibold">
                Para quem é a ração?
              </legend>
              <div className="mt-2 grid max-w-md grid-cols-2 gap-2">
                {(
                  [
                    ["caes", "Cachorro", DogIcon],
                    ["gatos", "Gato", CatIcon],
                  ] as const
                ).map(([slug, label, Icon]) => {
                  const selected = filters.species === slug;
                  return (
                    <button
                      key={slug}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSpecies(selected ? undefined : slug)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "bg-card hover:border-foreground/40",
                      )}
                    >
                      <Icon size={30} />
                      <span>
                        <span className="block font-display text-base font-semibold">
                          {label}
                        </span>
                        <span
                          className={cn(
                            "text-xs tabular-nums",
                            selected
                              ? "text-background/75"
                              : "text-muted-foreground",
                          )}
                        >
                          {speciesCounts.get(slug) ?? 0} embalagens
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
          {aside && <div className="mt-8 lg:mt-0">{aside}</div>}
        </div>
      </section>

      {strip && <div className="mx-auto max-w-6xl space-y-5 border-b px-4 py-5">{strip}</div>}

      <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[17rem_1fr]">
        <aside aria-label="Filtros" className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pt-6 pr-2 pb-10">
            <div className="flex items-baseline justify-between pb-2">
              <h2 className="font-display text-lg font-semibold">Filtros</h2>
              {count > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  Limpar ({count})
                </button>
              )}
            </div>
            {panel}
          </div>
        </aside>

        <section
          ref={resultsRef}
          aria-labelledby="resultados"
          className="min-w-0 scroll-mt-20 pt-6"
        >
          <SearchNotice search={search} query={deferredQuery} />

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-3">
            <h2
              id="resultados"
              className="font-display text-lg font-semibold"
              aria-live="polite"
            >
              {groups.length} {groups.length === 1 ? "ração" : "rações"}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {packages} {packages === 1 ? "embalagem" : "embalagens"}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="lg:hidden"
                onClick={() => setPanelOpen(true)}
              >
                <SlidersHorizontal className="size-4" aria-hidden /> Filtros
                {count > 0 && ` (${count})`}
              </Button>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">Ordenar por</span>
                <select
                  value={effectiveSort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  aria-label="Ordenar por"
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
          </div>

          <AppliedFilters
            filters={filters}
            brandBySlug={brandBySlug}
            onToggle={toggle}
            onSpecies={() => setSpecies(undefined)}
            onClear={clearAll}
            onClearPrice={() => setPrice(undefined, undefined)}
          />

          {groups.length > 0 ? (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((g) => (
                <li key={g.family}>
                  <FamilyCard group={g} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              search={search}
              filters={filters}
              onClearFilters={clearFilters}
              onClearAll={clearAll}
            />
          )}
          {groups.length > visible.length && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Mostrando {visible.length} de {groups.length} rações
              </p>
              <Button
                variant="outline"
                onClick={() => setPageSize((n) => n + PAGE_SIZE)}
              >
                Mostrar mais{" "}
                {Math.min(PAGE_SIZE, groups.length - visible.length)}
              </Button>
            </div>
          )}
        </section>
      </div>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent
          side="left"
          className="w-[92%] gap-0 overflow-y-auto sm:max-w-sm"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              Os números mostram quantas embalagens restam.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-5 pb-4">{panel}</div>
          <div className="sticky bottom-0 z-10 flex gap-2 border-t bg-background p-4">
            {count > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                Limpar
              </Button>
            )}
            <Button className="flex-1" onClick={() => setPanelOpen(false)}>
              Ver {groups.length} {groups.length === 1 ? "ração" : "rações"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function chipLabel(
  key: MultiKey,
  value: string,
  brandBySlug: Map<string, ComparatorBrand>,
) {
  switch (key) {
    case "brand":
      return brandBySlug.get(value)?.name ?? value;
    case "age":
      return LIFE_STAGE_LABEL[value as keyof typeof LIFE_STAGE_LABEL];
    case "size":
      return `Porte ${SIZE_LABEL[value as keyof typeof SIZE_LABEL].toLowerCase()}`;
    case "kind":
      return FOOD_TYPE_LABEL[value as keyof typeof FOOD_TYPE_LABEL].replace(
        / \(.*\)$/,
        "",
      );
    case "need":
      return NEED_LABEL[value as keyof typeof NEED_LABEL];
    case "weight":
      return WEIGHT_RANGES.find((r) => r.slug === value)?.label ?? value;
    default:
      return value;
  }
}

function AppliedFilters({
  filters,
  brandBySlug,
  onToggle,
  onSpecies,
  onClear,
  onClearPrice,
}: {
  filters: FilterState;
  brandBySlug: Map<string, ComparatorBrand>;
  onToggle: (key: MultiKey, value: string) => void;
  onSpecies: () => void;
  onClear: () => void;
  onClearPrice: () => void;
}) {
  const chips = MULTI_KEYS.flatMap((key) =>
    (filters[key] as string[]).map((value) => ({ key, value })),
  );
  if (!chips.length && !filters.species && filters.priceMin == null && filters.priceMax == null) return null;
  const chip =
    "inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs font-medium hover:border-foreground/40";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.species && (
        <button
          type="button"
          onClick={onSpecies}
          className={chip}
          aria-label={`Remover filtro ${filters.species === "caes" ? "Cachorro" : "Gato"}`}
        >
          {filters.species === "caes" ? "Cachorro" : "Gato"}{" "}
          <X className="size-3" aria-hidden />
        </button>
      )}
      {(filters.priceMin != null || filters.priceMax != null) && (
        <button type="button" onClick={onClearPrice} className={chip} aria-label="Remover filtro de preço">
          {filters.priceMin != null && filters.priceMax != null
            ? `R$ ${filters.priceMin} a R$ ${filters.priceMax}`
            : filters.priceMin != null
              ? `A partir de R$ ${filters.priceMin}`
              : `Até R$ ${filters.priceMax}`}{" "}
          <X className="size-3" aria-hidden />
        </button>
      )}
      {chips.map(({ key, value }) => (
        <button
          key={`${key}:${value}`}
          type="button"
          onClick={() => onToggle(key, value)}
          className={chip}
          aria-label={`Remover filtro ${chipLabel(key, value, brandBySlug)}`}
        >
          {chipLabel(key, value, brandBySlug)}{" "}
          <X className="size-3" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-xs font-medium underline underline-offset-4"
      >
        Limpar tudo
      </button>
    </div>
  );
}

function SearchNotice({
  search,
  query,
}: {
  search: SearchResult;
  query: string;
}) {
  if (search.mode === "all") return null;
  const q = query.trim();
  const corrections = search.corrections.length > 0 && (
    <>
      {" "}
      Consideramos{" "}
      {search.corrections.map((c, i) => (
        <span key={c.typed}>
          {i > 0 && ", "}
          <span className="line-through decoration-muted-foreground/60">
            {c.typed}
          </span>{" "}
          →{" "}
          <strong className="font-semibold text-foreground">
            {c.suggestion}
          </strong>
        </span>
      ))}
      .
    </>
  );
  if (search.mode === "exact") {
    return (
      <p className="mb-3 text-sm text-muted-foreground">
        Resultados para{" "}
        <strong className="font-semibold text-foreground">“{q}”</strong>.
        {corrections}
      </p>
    );
  }
  if (search.mode === "closest") {
    return (
      <div
        role="status"
        className="mb-4 border-l-2 border-foreground bg-muted px-4 py-3 text-sm"
      >
        <p className="font-semibold">
          Não encontramos uma embalagem exata para “{q}”.
        </p>
        <p className="mt-0.5 text-muted-foreground">
          Mostrando as mais próximas
          {search.unknownTerms.length
            ? ` (sem correspondência para “${search.unknownTerms.join("”, “")}”)`
            : ""}
          .{corrections}
        </p>
      </div>
    );
  }
  return null;
}

function EmptyState({
  search,
  filters,
  onClearFilters,
  onClearAll,
}: {
  search: SearchResult;
  filters: FilterState;
  onClearFilters: () => void;
  onClearAll: () => void;
}) {
  const noSearchMatch = search.mode === "none";
  return (
    <div className="mt-4 rounded-lg border px-5 py-10 text-center sm:px-10">
      <h3 className="font-display text-lg font-semibold">
        {noSearchMatch
          ? "Nenhuma ração parecida com a busca"
          : "Nenhuma ração com essa combinação"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {noSearchMatch
          ? "Confira a grafia ou tente só a marca e o peso, por exemplo “Golden 15 kg”."
          : "Tire um dos filtros: os números ao lado de cada opção mostram quantas embalagens restam."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {activeFilterCount(filters) > 0 && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          Limpar busca e filtros
        </Button>
      </div>
    </div>
  );
}
