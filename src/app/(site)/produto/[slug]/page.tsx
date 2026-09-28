import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronRight, Info, Stethoscope } from "lucide-react";

import { BrandSwatch } from "@/components/comparator/brand-swatch";
import { DemoTag } from "@/components/comparator/family-card";
import { OfferList } from "@/components/comparator/offer-list";
import { PackagePhoto } from "@/components/comparator/package-photo";
import { PriceAlertButton } from "@/components/comparator/price-alert";
import { PriceSignalTag } from "@/components/comparator/price-signal";
import { TopicGrid } from "@/components/comparator/topic-icons";
import { TrackView } from "@/components/comparator/track-view";
import { siteConfig } from "@/config/site";
import { getCatalogItem, staleHours } from "@/lib/catalog/public";
import { defaultItem, groupByFamily, unitPriceOf } from "@/lib/comparator/filters";
import { itemTopics, packageLabel, storeCountLabel } from "@/lib/comparator/labels";
import type { ComparatorItem } from "@/lib/comparator/types";
import { formatBRL, formatWeight } from "@/lib/format";
import { alertSendingActive } from "@/lib/price-alerts/store";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function fullName(i: ComparatorItem) {
  return [i.title, i.flavor].filter(Boolean).join(" · ");
}

export async function generateMetadata({ params }: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getCatalogItem(slug);
  if (!found) return { title: "Ração não encontrada" };
  const { item } = found;
  const name = `${fullName(item)} ${formatWeight(item.netWeightGrams)}`;
  return {
    title: `${name}: compare preços`,
    description:
      item.bestPrice != null && !item.isDemo
        ? `Compare ${name} em ${storeCountLabel(item.storeCount)}: menor preço ${formatBRL(item.bestPrice)} (${timeAgo(item.updatedAt)}). Peso, sabor e frete conferidos por loja.`
        : `Onde comprar ${name}: lojas, preço por kg, peso e sabor de cada anúncio para conferir antes de comprar.`,
    alternates: { canonical: `/produto/${slug}` },
  };
}

export default async function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const found = await getCatalogItem(slug);
  if (!found) notFound();
  const { item, items } = found;
  const hours = staleHours();

  const unit = unitPriceOf(item);
  const topics = itemTopics(item).filter((t) => t.key !== "veterinario" && t.key !== "grao");
  const sizes = items.filter((i) => i.family === item.family).sort((a, b) => a.netWeightGrams - b.netWeightGrams);
  const priced = item.offers.filter((o) => o.inStock && o.price != null);
  const worst = priced.length > 1 ? Math.max(...priced.map((o) => o.price!)) : null;

  const others = groupByFamily(
    items.filter((i) => i.brand.slug === item.brand.slug && i.species === item.species && i.family !== item.family),
    items,
  ).map((g) => defaultItem(g));
  const sameLine = others.filter((i) => i.lineName === item.lineName).slice(0, 6);
  const sameBrand = others.filter((i) => i.lineName !== item.lineName).slice(0, 6);
  const speciesLabel = item.species === "caes" ? "Cachorros" : "Gatos";

  // Dados estruturados só com preços reais (nunca com preços de exemplo).
  const realPrices = priced.filter((o) => !o.isDemo).map((o) => o.price!);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${item.brand.name} ${fullName(item)} ${formatWeight(item.netWeightGrams)}`,
    brand: { "@type": "Brand", name: item.brand.name },
    ...(item.gtin ? { gtin: item.gtin } : {}),
    ...(realPrices.length
      ? { offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: Math.min(...realPrices), highPrice: Math.max(...realPrices), offerCount: realPrices.length } }
      : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackView id={item.id} slug={item.slug} />
      <nav aria-label="Trilha" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Início
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={`/?especie=${item.species}`} className="hover:text-foreground">
          {speciesLabel}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={`/?especie=${item.species}&marca=${item.brand.slug}`} className="hover:text-foreground">
          {item.brand.name}
        </Link>
      </nav>

      <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr] lg:grid-cols-[440px_minmax(0,1fr)_300px] lg:gap-8">
        <div className="md:row-span-2 lg:row-span-1">
          <PackagePhoto item={item} className="mx-auto aspect-square w-full max-w-[22rem] md:max-w-none" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <BrandSwatch brand={item.brand} size={26} /> {item.brand.name}
            {item.isDemo && <DemoTag />}
          </p>
          <h1 className="mt-2 font-display text-2xl leading-tight font-bold text-balance sm:text-[1.75rem]">
            {fullName(item)} <span className="whitespace-nowrap text-muted-foreground">· {packageLabel(item)}</span>
          </h1>
          {item.kind === "medicamentosa" && (
            <p className="mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
              <Stethoscope className="mt-0.5 size-4 shrink-0" aria-hidden /> Alimento de uso veterinário: só troque ou compre com orientação do seu veterinário.
            </p>
          )}
          <h2 className="sr-only">Ficha da embalagem</h2>
          <TopicGrid topics={topics} item={item} className="mt-5" />
          {item.description && <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-foreground/90">{item.description}</p>}
        </div>
        <div className="space-y-5 md:col-start-2 lg:col-start-auto">
          <div className="rounded-lg border bg-card p-4 sm:p-5">
            {item.bestPrice != null ? (
              <>
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  Menor preço em {storeCountLabel(item.storeCount)} {item.isDemo && <DemoTag />}
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                  <span className="font-display text-3xl font-bold tabular-nums">{formatBRL(item.bestPrice)}</span>
                  {unit && (
                    <span className="text-lg font-semibold text-foreground/80 tabular-nums">
                      {formatBRL(unit.value)}
                      {unit.label}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Só o produto, sem frete.</p>
                <PriceSignalTag item={item} className="mt-2" />
                <p className={cn("mt-2 flex items-center gap-1 text-xs", item.bestPriceStale ? "font-medium text-warning-foreground" : "text-muted-foreground")}>
                  {item.bestPriceStale && <AlertTriangle className="size-3.5" aria-hidden />}
                  {item.bestPriceStale ? `Desatualizado (mais de ${hours} h): ` : "Atualizado "}
                  {timeAgo(item.updatedAt)}
                </p>
                {worst != null && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Da loja mais barata para a mais cara: <strong className="text-foreground">{formatBRL(worst - item.bestPrice)}</strong> de diferença.
                  </p>
                )}
                <a href="#lojas" className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Ver preços por loja
                </a>
              </>
            ) : (
              <p className="text-sm">{item.offers.length ? "Nenhuma loja com preço disponível agora." : "Ainda não há ofertas cadastradas para esta ração."}</p>
            )}
          </div>

          {sizes.length > 1 && (
            <div>
              <p className="text-sm font-semibold">Outros tamanhos desta ração</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const u = unitPriceOf(s);
                  const current = s.id === item.id;
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/produto/${s.slug}`}
                        aria-current={current ? "page" : undefined}
                        className={cn("flex flex-col rounded-md border px-3 py-2 text-sm transition-colors", current ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/40")}
                      >
                        <span className="font-display font-semibold tabular-nums">{s.unitCount ? packageLabel(s) : formatWeight(s.netWeightGrams)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{u ? `${formatBRL(u.value)}${u.label}` : "sem preço"}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <section id="lojas" aria-labelledby="lojas-titulo" className="mt-12 scroll-mt-24">
        <h2 id="lojas-titulo" className="font-display text-xl font-semibold">
          Ofertas em {storeCountLabel(item.offers.length)}
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Cada loja com o peso e o sabor do anúncio, para conferir se é a mesma embalagem. Nenhuma loja paga para aparecer primeiro.
        </p>
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm">
            <strong>Achou caro?</strong> Deixe seu e-mail e avisamos quando esta ração baixar de preço.
          </p>
          <PriceAlertButton
            sendingActive={alertSendingActive()}
            className="shrink-0"
            product={{ id: item.id, name: `${item.brand.name} · ${fullName(item)} · ${packageLabel(item)}`, bestPrice: item.bestPrice }}
          />
        </div>
        {item.offers.some((o) => o.isDemo) && (
          <p className="mb-3 flex items-start gap-2 rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-950 dark:bg-violet-950 dark:text-violet-100">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Ofertas marcadas como “Exemplo” têm preços fictícios de demonstração e não levam a uma loja.
          </p>
        )}
        {item.offers.length ? (
          <OfferList item={item} staleHours={hours} />
        ) : (
          <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma oferta cadastrada ainda.</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{siteConfig.affiliateDisclaimer}</p>
      </section>

      {sameLine.length > 0 && (
        <Section id="linha" title={`Mais opções da linha ${item.lineName}`}>
          <OtherGrid items={sameLine} all={items} />
        </Section>
      )}
      {sameBrand.length > 0 && (
        <Section id="marca" title={`Outras opções ${item.brand.name} para ${speciesLabel.toLowerCase()}`}>
          <OtherGrid items={sameBrand} all={items} />
        </Section>
      )}
    </div>
  );
}

function OtherGrid({ items, all }: { items: ComparatorItem[]; all: ComparatorItem[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => {
        const weights = all.filter((x) => x.family === i.family).map((x) => formatWeight(x.netWeightGrams));
        const u = unitPriceOf(i);
        return (
          <li key={i.id}>
            <Link href={`/produto/${i.slug}`} className="flex h-full gap-3 rounded-lg border p-3 transition-colors hover:border-foreground/40">
              <PackagePhoto item={i} compact className="aspect-[3/4] w-16 shrink-0 self-start" />
              <span className="min-w-0">
                <span className="block text-sm leading-snug font-semibold">{fullName(i)}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{weights.join(" · ")}</span>
                {i.bestPrice != null && (
                  <span className="mt-1.5 block text-sm tabular-nums">
                    a partir de <strong>{formatBRL(i.bestPrice)}</strong>
                    {u && (
                      <span className="text-muted-foreground">
                        {" "}· {formatBRL(u.value)}
                        {u.label}
                      </span>
                    )}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="mt-12 scroll-mt-24">
      <h2 id={`${id}-titulo`} className="mb-4 font-display text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}
