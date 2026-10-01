import Link from "next/link";

import type { ComparatorBrand } from "@/lib/comparator/types";

import { BrandSwatch } from "./brand-swatch";

/** Marcas com mais rações no catálogo, com atalho para o filtro. */
export function PopularBrands({ brands }: { brands: (ComparatorBrand & { count: number })[] }) {
  if (!brands.length) return null;
  return (
    <section aria-labelledby="marcas-populares" className="min-w-0">
      <h2 id="marcas-populares" className="text-sm font-semibold">
        Marcas populares
      </h2>
      <ul className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible">
        {brands.map((b) => (
          <li key={b.slug} className="shrink-0">
            <Link
              href={`/?marca=${b.slug}#resultados`}
              className="flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-sm transition-colors hover:border-foreground/40"
            >
              <BrandSwatch brand={b} size={24} className="rounded-full" />
              <span className="font-medium">{b.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{b.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
