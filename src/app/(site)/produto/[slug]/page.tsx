import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator, ChevronRight, HelpCircle } from "lucide-react";

import { VetWarning } from "@/components/funnel/funnel";
import { BrandMark } from "@/components/icons/brand-mark";
import { OutboundOfferButton } from "@/components/offers/outbound-offer-button";
import { UnitPriceTag } from "@/components/offers/unit-price";
import { MonthlyKitCard } from "@/components/product/monthly-kit";
import { OfferComparison } from "@/components/product/offer-comparison";
import { PriceHistoryChart } from "@/components/product/price-history-chart";
import { ProductThumb } from "@/components/product/product-thumb";
import { RelatedCarousel } from "@/components/product/related-carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { FOOD_TYPES, LIFE_STAGES, REFINEMENTS, SEGMENTS, SIZES, SPECIES, labelFor } from "@/config/taxonomy";
import { getMonthlyKit, getProduct, getProductSlugs, getRelated } from "@/lib/data";
import { formatBRL, formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Fase 0: só slugs conhecidos (404 real). Na Fase 1, trocar por ISR com dynamicParams. */
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getProduct(slug);
  if (!detail) return {};
  const best = detail.offers[0];
  return {
    title: `${detail.product.name}: menor preço`,
    description: `Compare ${detail.product.name} em ${detail.offers.length} lojas. Menor preço hoje: ${formatBRL(best.offer.price)} (${formatBRL(best.unitPrice.value)}${best.unitPrice.label}).`,
    alternates: { canonical: `/produto/${slug}` },
  };
}

export default async function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const detail = await getProduct(slug);
  if (!detail) notFound();
  const { product, brand, line, offers, history, variants } = detail;
  const [related, kit] = await Promise.all([getRelated(slug, offers[0]?.store.id), getMonthlyKit(slug)]);

  const available = offers.filter((o) => o.offer.inStock);
  const best = available[0];
  const species = SPECIES.find((s) => s.slug === product.species)!;
  const foodType = FOOD_TYPES.find((f) => f.slug === product.foodType)!;
  const isVet = product.foodType === "dietas-veterinarias";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: brand.name },
    ...(product.ean ? { gtin13: product.ean } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BRL",
      lowPrice: Math.min(...available.map((o) => o.offer.price)),
      highPrice: Math.max(...available.map((o) => o.offer.price)),
      offerCount: available.length,
    },
  };

  const chips = [
    labelFor(SEGMENTS, product.segment),
    ...product.lifeStages.map((s) => labelFor(LIFE_STAGES, s)),
    ...product.sizes.map((s) => `Porte ${labelFor(SIZES, s)?.toLowerCase()}`),
    product.flavor,
    ...product.refinements.map((r) => labelFor(REFINEMENTS, r)),
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Trilha" className="mb-5 flex flex-wrap items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Início</Link>
        <ChevronRight className="size-3" aria-hidden />
        <Link href={`/${product.species}`} className="hover:text-foreground">{species.label === "Cão" ? "Cães" : "Gatos"}</Link>
        <ChevronRight className="size-3" aria-hidden />
        <Link href={`/${product.species}/${product.foodType}`} className="hover:text-foreground">{foodType.label}</Link>
        <ChevronRight className="size-3" aria-hidden />
        <Link href={`/marca/${brand.slug}`} className="hover:text-foreground">{brand.name}</Link>
      </nav>

      <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr] lg:gap-10">
        <ProductThumb product={product} brand={brand} size="lg" className="mx-auto w-full max-w-xs md:max-w-none" />
        <div className="space-y-5">
          <div>
            <Link href={`/marca/${brand.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
              <BrandMark brand={brand} size={24} /> {brand.name}
              {line && <span className="font-medium">· {line.name}</span>}
            </Link>
            <h1 className="mt-2 text-2xl leading-tight font-black sm:text-3xl">{product.name}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <Badge key={c} variant="accent">{c}</Badge>
              ))}
              <Badge variant="outline">{formatWeight(product.netWeightGrams)}</Badge>
            </div>
            {product.ean && <p className="mt-2 text-xs text-muted-foreground">EAN {product.ean}</p>}
          </div>

          {isVet && <VetWarning />}

          {best ? (
            <div className="rounded-3xl border bg-card p-5 shadow-xs">
              <p className="text-xs font-bold tracking-wide text-primary uppercase">Menor preço hoje</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <UnitPriceTag unitPrice={best.unitPrice} size="lg" />
                  <p className="mt-1 text-sm text-muted-foreground">
                    <strong className="text-foreground">{formatBRL(best.offer.price)}</strong> {best.store.preposition} {best.store.name}
                    {available.length > 1 && <> · até {formatBRL(Math.max(...available.map((o) => o.offer.price)))} em outras lojas</>}
                  </p>
                </div>
                <OutboundOfferButton
                  offerId={best.offer.id}
                  size="lg"
                  label={`Ver ${best.store.preposition} ${best.store.name}`}
                  drawer={{ productSlug: product.slug, productName: product.name, storeId: best.store.id, storeName: best.store.name }}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-2xl bg-muted p-4 text-sm">Sem ofertas disponíveis no momento.</p>
          )}
        </div>
      </div>

      <Section id="lojas" title={`Compare ${offers.length} lojas`} subtitle={`Ordenado pelo menor preço ${best?.unitPrice.metric === "kg" ? "por kg" : "por 100 g"}. A comissão não altera a ordem.`}>
        <OfferComparison offers={offers} product={product} />
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <HelpCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            O preço pode mudar entre a nossa verificação e a sua visita.{" "}
            <Link href="/faq#preco-diferente" className="font-semibold text-primary hover:underline">Por que o preço pode ser diferente na loja?</Link>
          </span>
        </p>
      </Section>

      {variants.length > 1 && (
        <Section id="embalagens" title="Embalagens disponíveis" subtitle="A embalagem maior costuma sair mais barata por kg.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {variants.map((v) => {
              const current = v.product.id === product.id;
              return (
                <Link
                  key={v.product.id}
                  href={`/produto/${v.product.slug}`}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border bg-card p-4 transition hover:border-primary/40",
                    current && "border-primary ring-2 ring-primary/15",
                  )}
                >
                  <span className="font-display text-lg font-extrabold">{formatWeight(v.product.netWeightGrams)}</span>
                  <span className="text-right">
                    <UnitPriceTag unitPrice={v.best.unitPrice} className="text-lg" />
                    <span className="text-xs text-muted-foreground">{formatBRL(v.best.offer.price)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <Section id="historico" title="Histórico de preço" subtitle={`Últimos 60 dias, verificado ${siteConfig.checkIntervalLabel}.`}>
        <div className="rounded-3xl border bg-card p-4 sm:p-6">
          <PriceHistoryChart history={history} />
        </div>
      </Section>

      {related.length > 0 && (
        <Section id="compre-junto" title="Compre junto" subtitle="Sugestões — podemos receber comissão por compras.">
          <RelatedCarousel items={related} />
        </Section>
      )}

      {kit && (
        <section className="mt-12">
          <MonthlyKitCard kit={kit} />
        </section>
      )}

      {product.format === "dry" && !isVet && (
        <section className="mt-12 flex flex-col items-start justify-between gap-4 rounded-3xl border bg-secondary/60 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold">Quanto tempo este pacote dura?</h2>
            <p className="text-sm text-muted-foreground">Calcule o gasto mensal pelo peso do seu pet.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/calculadora?produto=${product.slug}`}>
              <Calculator /> Calcular gasto mensal
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="mt-12 scroll-mt-28">
      <h2 id={`${id}-titulo`} className="text-2xl font-extrabold">{title}</h2>
      {subtitle && <p className="mt-1 mb-4 text-sm text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  );
}
