import type { Metadata } from "next";
import Link from "next/link";

import { AppliedFilters, FiltersSidebar } from "@/components/admin/filters-sidebar";
import { MobileFilters } from "@/components/admin/mobile-filters";
import { ProductsTable } from "@/components/admin/products-table";
import { btn, EmptyState, Flash, input, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  buildRows,
  computeFacets,
  FILTER_DIMENSIONS,
  matchesFilters,
  productFiltersHref,
  readProductFilters,
  sortRows,
  type ProductSort,
} from "@/lib/admin/product-list";
import { adminRepo } from "@/lib/admin/repository";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/produtos">) {
  await requireAdmin();
  const [db, sp] = await Promise.all([adminRepo.read(), searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const { filters, sort, dir } = readProductFilters(sp);

  const all = buildRows(db.products);
  const facets = computeFacets(all, filters);
  const rows = sortRows(all.filter((r) => matchesFilters(r, filters)), sort, dir);
  const appliedCount = FILTER_DIMENSIONS.reduce((n, d) => n + (filters[d]?.length ?? 0), 0) + (filters.q ? 1 : 0);
  const returnTo = productFiltersHref(filters, sort, dir);

  const sortHeader = (key: ProductSort, label: string) => {
    const active = sort === key;
    const nextDir = active && dir === "asc" ? "desc" : "asc";
    return (
      <Link href={productFiltersHref(filters, key, nextDir)} scroll={false} className={active ? "text-foreground" : "hover:text-foreground"}>
        {label}
        {active && <span aria-hidden> {dir === "asc" ? "↑" : "↓"}</span>}
        <span className="sr-only">{active ? `, ordenado ${dir === "asc" ? "crescente" : "decrescente"}` : ", ordenar"}</span>
      </Link>
    );
  };

  const sidebar = <FiltersSidebar facets={facets} filters={filters} sort={sort} dir={dir} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Produtos"
        description="Cada ficha é uma embalagem exata (outro sabor ou peso = outra ficha). Os tópicos da ficha são os mesmos que o cliente vê no site."
        actions={
          <Link href="/admin/produtos/novo" className={btn.primary}>
            Cadastrar ração
          </Link>
        }
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      <div className="flex gap-6">
        <aside aria-label="Filtros" className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-16 max-h-[calc(100dvh-5rem)] overflow-y-auto pr-1">
            <p className="flex items-center justify-between pb-1 text-sm font-semibold">
              Filtros
              {appliedCount > 0 && (
                <Link href="/admin/produtos" className="text-xs font-medium text-muted-foreground underline underline-offset-4">
                  Limpar filtros
                </Link>
              )}
            </p>
            {sidebar}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <MobileFilters count={appliedCount} resultCount={rows.length}>
              {sidebar}
            </MobileFilters>
            <form role="search" className="flex min-w-0 flex-1 gap-2" action="/admin/produtos">
              {FILTER_DIMENSIONS.flatMap((d) => (filters[d] ?? []).map((v) => <input key={`${d}:${v}`} type="hidden" name={d} value={v} />))}
              {sort !== "nome" && <input type="hidden" name="ordem" value={sort} />}
              {dir !== "asc" && <input type="hidden" name="dir" value={dir} />}
              <label htmlFor="busca-produtos" className="sr-only">
                Buscar produtos
              </label>
              <input id="busca-produtos" name="q" defaultValue={filters.q ?? ""} placeholder="Buscar por marca, fórmula ou sabor" className={input + " max-w-md"} />
              <button className={btn.secondary} type="submit">
                Buscar
              </button>
            </form>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {rows.length} de {all.length}
            </p>
          </div>
          <AppliedFilters facets={facets} filters={filters} sort={sort} dir={dir} />

          {rows.length ? (
            <ProductsTable
              rows={rows}
              returnTo={returnTo}
              sortHeader={{ nome: sortHeader("nome", "Produto"), peso: sortHeader("peso", "Peso"), atualizado: sortHeader("atualizado", "Atualizado") }}
            />
          ) : (
            <EmptyState title={all.length ? "Nenhum produto com esses filtros." : "Nenhum produto cadastrado."}>
              {all.length ? (
                <>
                  Remova algum filtro ou{" "}
                  <Link href="/admin/produtos" className="underline underline-offset-4">
                    limpe todos
                  </Link>
                  .
                </>
              ) : (
                <Link href="/admin/produtos/novo" className="underline underline-offset-4">
                  Cadastrar a primeira ração
                </Link>
              )}
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}
