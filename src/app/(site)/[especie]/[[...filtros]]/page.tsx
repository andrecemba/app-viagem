import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Funnel } from "@/components/funnel/funnel";
import { ResultsToolbar } from "@/components/funnel/results-toolbar";
import { EmptyState } from "@/components/offers/empty-state";
import { ListingCard } from "@/components/offers/listing-card";
import { ListingSkeleton } from "@/components/offers/listing-skeleton";
import { siteConfig } from "@/config/site";
import { FOOD_TYPES, LIFE_STAGES, SEGMENTS, SIZES, SPECIES, labelFor } from "@/config/taxonomy";
import { getBrands, getFunnelCounts, getOffers, getStores } from "@/lib/data";
import {
  buildFunnelPath,
  currentStep,
  parseFilterParams,
  parseFunnelPath,
  type FunnelSelection,
  type OfferFilters,
} from "@/lib/funnel/filters";
import type { Brand } from "@/types/catalog";

type Props = PageProps<"/[especie]/[[...filtros]]">;

async function resolveSelection(params: Props["params"]) {
  const { especie, filtros = [] } = await params;
  const brands = await getBrands();
  const selection = parseFunnelPath([especie, ...filtros], brands.map((b) => b.slug));
  if (!selection?.species) notFound();
  return { selection, brands };
}

function describe(selection: FunnelSelection, brands: Brand[]) {
  const parts = [
    labelFor(FOOD_TYPES, selection.foodType) ?? "Ração e petiscos",
    selection.species === "caes" ? "para cães" : "para gatos",
    selection.lifeStage && labelFor(LIFE_STAGES, selection.lifeStage)?.toLowerCase(),
    selection.size && `porte ${labelFor(SIZES, selection.size)?.toLowerCase()}`,
    selection.segment && labelFor(SEGMENTS, selection.segment)?.toLowerCase(),
    selection.brand && brands.find((b) => b.slug === selection.brand)?.name,
  ];
  return parts.filter(Boolean).join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { selection, brands } = await resolveSelection(params);
  const title = `${describe(selection, brands)}: menor preço`;
  return {
    title,
    description: `Compare o preço por kg de ${describe(selection, brands).toLowerCase()} nas principais lojas. Preços verificados ${siteConfig.checkIntervalLabel}.`,
    alternates: { canonical: buildFunnelPath(selection) },
  };
}

export default async function ResultsPage({ params, searchParams }: Props) {
  const { selection, brands } = await resolveSelection(params);
  const query = await searchParams;
  const etapa = Array.isArray(query.etapa) ? query.etapa[0] : query.etapa;
  const queryFilters = parseFilterParams(query);
  const filters = { ...selection, ...queryFilters };
  const step = currentStep(selection, etapa);

  // A URL já foi validada acima (404 real); só a lista entra em streaming.
  const [counts, stores, speciesBrands] = await Promise.all([
    step ? getFunnelCounts(filters, step) : Promise.resolve({}),
    getStores(),
    getBrands(selection.species),
  ]);

  const speciesLabel = SPECIES.find((s) => s.slug === selection.species)!.label;
  const metricLabel = selection.foodType === "racao-umida" || selection.foodType === "petiscos" ? "por 100 g" : "por kg";
  const hasQueryFilters = !!(queryFilters.refinements?.length || queryFilters.packageRange || queryFilters.storeSlugs?.length);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-bold tracking-wide text-primary uppercase">{speciesLabel}</p>
      <h1 className="mb-6 text-3xl font-black first-letter:uppercase sm:text-4xl">{describe(selection, brands)}</h1>

      <Funnel selection={selection} step={step} counts={counts} brands={speciesBrands} filters={queryFilters} />

      <section aria-labelledby="resultados" className="mt-10 space-y-5">
        <ResultsToolbar selection={selection} filters={queryFilters} stores={stores} etapa={etapa} metricLabel={metricLabel} />
        <Suspense key={JSON.stringify(filters)} fallback={<ListingSkeleton />}>
          <ResultsList
            filters={filters}
            metricLabel={metricLabel}
            resetHref={hasQueryFilters ? buildFunnelPath(selection) : `/${selection.species}`}
          />
        </Suspense>
        <p className="text-xs text-muted-foreground">
          A comissão nunca altera a ordem: se duas ofertas empatam (diferença de até 1%), a que tem link de afiliado aparece
          primeiro. {siteConfig.affiliateDisclaimer}
        </p>
      </section>
    </div>
  );
}

async function ResultsList({ filters, metricLabel, resetHref }: { filters: OfferFilters; metricLabel: string; resetHref: string }) {
  const listings = await getOffers(filters);
  return (
    <>
      <h2 id="resultados" className="text-2xl font-extrabold">
        {listings.length} {listings.length === 1 ? "produto" : "produtos"}
        <span className="ml-2 text-base font-semibold text-muted-foreground">
          ordenados pelo menor {filters.sort === "total" ? "preço total" : `preço ${metricLabel}`}
        </span>
      </h2>
      {listings.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {listings.map((l, i) => (
            <ListingCard key={l.product.id} listing={l} rank={i} />
          ))}
        </div>
      ) : (
        <EmptyState resetHref={resetHref} />
      )}
    </>
  );
}
