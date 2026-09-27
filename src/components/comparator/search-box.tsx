"use client";

import { forwardRef, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { normalize, searchItems, type SearchIndex } from "@/lib/comparator/search";
import type { ComparatorBrand, ComparatorItem } from "@/lib/comparator/types";
import { formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

import { BrandSwatch } from "./brand-swatch";

type Suggestion =
  | { kind: "brand"; id: string; brand: ComparatorBrand; count: number }
  | { kind: "product"; id: string; item: ComparatorItem; weights: number[] };

/**
 * Campo de busca com sugestões enquanto digita: primeiro as marcas (com o selo),
 * depois as rações. Escolher uma marca aplica o filtro; escolher uma ração abre a página dela.
 */
export const SearchBox = forwardRef<
  HTMLInputElement,
  {
    query: string;
    onQueryChange: (q: string) => void;
    index: SearchIndex;
    brands: ComparatorBrand[];
    items: ComparatorItem[];
    onPickBrand: (slug: string) => void;
    onSubmit: () => void;
  }
>(function SearchBox({ query, onQueryChange, index, brands, items, onPickBrand, onSubmit }, ref) {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Sugestões usam o texto atual (não o atrasado dos resultados), para não piscar opções velhas.
  const search = useMemo(() => searchItems(index, query), [index, query]);
  const q = normalize(query.trim());
  const suggestions: Suggestion[] = [];
  if (q.length >= 2 && search.mode !== "none") {
    const direct = brands.filter((b) => normalize(b.name).split(/\s+/).some((w) => w.startsWith(q.split(" ")[0])));
    const fromResults = search.items.slice(0, 30).map((i) => i.brand);
    const seen = new Set<string>();
    for (const b of [...direct, ...fromResults]) {
      if (seen.has(b.slug) || seen.size >= 3) continue;
      seen.add(b.slug);
      suggestions.push({ kind: "brand", id: `b-${b.slug}`, brand: b, count: items.filter((i) => i.brand.slug === b.slug).length });
    }
    const families = new Set<string>();
    for (const item of search.items) {
      if (families.has(item.family)) continue;
      families.add(item.family);
      const weights = items.filter((i) => i.family === item.family).map((i) => i.netWeightGrams).sort((a, b) => a - b);
      suggestions.push({ kind: "product", id: `p-${item.id}`, item, weights });
      if (families.size >= 5) break;
    }
  }
  const show = open && suggestions.length > 0;

  const choose = (s: Suggestion) => {
    setOpen(false);
    setActive(-1);
    if (s.kind === "brand") onPickBrand(s.brand.slug);
    else router.push(`/produto/${s.item.slug}`);
  };

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        if (show && active >= 0) choose(suggestions[active]);
        else {
          setOpen(false);
          onSubmit();
        }
      }}
    >
      <label htmlFor="busca" className="sr-only">
        Buscar ração por marca, linha, sabor ou peso
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          ref={ref}
          id="busca"
          type="search"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!show) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Digite a marca ou o nome da ração"
          className="h-14 w-full rounded-lg border border-input bg-card pr-24 pl-12 text-base shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors outline-none placeholder:text-muted-foreground/80 focus:border-foreground focus:ring-[3px] focus:ring-ring/20 sm:h-16 sm:text-lg [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden /> Limpar
          </button>
        )}
      </div>

      {show && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Sugestões"
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-[70vh] overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2",
                i === active && "bg-muted",
                s.kind === "product" && i > 0 && suggestions[i - 1].kind === "brand" && "mt-1 border-t pt-2.5",
              )}
            >
              {s.kind === "brand" ? (
                <>
                  <BrandSwatch brand={s.brand} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{s.brand.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">Marca · {s.count} embalagens</span>
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Filtrar</span>
                </>
              ) : (
                <>
                  <BrandSwatch brand={s.item.brand} size={20} className="opacity-80" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block truncate">
                      {!s.item.title.startsWith(s.item.brand.name) && <span className="font-medium">{s.item.brand.name} </span>}
                      <span className="font-medium">{s.item.title}</span>
                      {s.item.flavor && <span className="text-muted-foreground"> · {s.item.flavor}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.weights.map((w) => formatWeight(w)).join(" · ")}</span>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
});
