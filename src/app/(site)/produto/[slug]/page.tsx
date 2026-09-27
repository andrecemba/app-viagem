import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronRight, HelpCircle, Stethoscope, Truck } from "lucide-react";

import { BrandSwatch } from "@/components/comparator/brand-swatch";
import { PackagePhoto } from "@/components/comparator/package-photo";
import { PriceSignalTag } from "@/components/comparator/price-signal";
import { TrackView } from "@/components/comparator/track-view";
import { StoreLogo } from "@/components/icons/store-logo";
import { siteConfig } from "@/config/site";
import { MOCK_NOW } from "@/data/mock/random";
import { defaultItem, groupByFamily, unitPriceOf } from "@/lib/comparator/filters";
import { itemTopics, packageLabel, storeCountLabel } from "@/lib/comparator/labels";
import type { ComparatorItem } from "@/lib/comparator/types";
import { catalogSource, getCatalogItem } from "@/lib/data";
import { formatBRL, formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getCatalogItem(slug);
  if (!found) return {};
  const { item } = found;
  const name = [item.brand.name, item.title, item.flavor, formatWeight(item.netWeightGrams)].filter(Boolean).join(" ");
  return {
    title: `${name}: preços nas lojas`,
    description: item.bestPrice
      ? `Compare ${name} em ${storeCountLabel(item.storeCount)}. Menor preço: ${formatBRL(item.bestPrice)}.`
      : `Ficha e lojas de ${name}.`,
    alternates: { canonical: `/produto/${slug}` },
  };
}

function fullName(i: ComparatorItem) {
  return [i.title, i.flavor].filter(Boolean).join(" · ");
}

function timeAgo(iso: string, now: Date) {
  const h = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 3600_000);
  if (h < 1) return "há menos de 1 hora";
  if (h < 48) return `há ${Math.round(h)} h`;
  return `há ${Math.round(h / 24)} dias`;
}

export default async function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const found = await getCatalogItem(slug);
  if (!found) notFound();
  const { item, items } = found;
  const demo = catalogSource() === "exemplo";
  const now = demo ? MOCK_NOW : new Date();

  const unit = unitPriceOf(item);
  const topics = itemTopics(item);
  const sizes = items.filter((i) => i.family === item.family).sort((a, b) => a.netWeightGrams - b.netWeightGrams);
  const available = item.offers.filter((o) => o.inStock);
  const unavailable = item.offers.filter((o) => !o.inStock);
  const worst = available.length > 1 ? available[available.length - 1].price : null;

  // Outras opções: mesma fórmula com outro sabor; depois, outras fórmulas da marca para a mesma espécie.
  const others = groupByFamily(
    items.filter((i) => i.brand.slug === item.brand.slug && i.species === item.species && i.family !== item.family),
    items,
  ).map((g) => defaultItem(g));
  const sameFormula = others.filter((i) => i.title === item.title);
  const sameBrand = others.filter((i) => i.title !== item.title).slice(0, 6);

  const speciesLabel = item.species === "caes" ? "Cachorros" : "Gatos";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <TrackView id={item.id} />
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

      <div className="grid gap-6 md:grid-cols-[minmax(0,300px)_1fr] lg:gap-10">
        <PackagePhoto item={item} className="mx-auto aspect-square w-full max-w-[18rem] md:max-w-none" />
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <BrandSwatch brand={item.brand} size={26} /> {item.brand.name}
            {item.lineName && item.lineName !== item.brand.name && <span className="font-medium">· {item.lineName}</span>}
          </p>
          <h1 className="mt-2 font-display text-2xl leading-tight font-bold text-balance sm:text-3xl">
            {fullName(item)} <span className="whitespace-nowrap text-muted-foreground">· {packageLabel(item)}</span>
          </h1>

          <div className="mt-5 rounded-lg border bg-card p-4 sm:p-5">
            {item.bestPrice != null ? (
              <>
                <p className="text-sm text-muted-foreground">Menor preço em {storeCountLabel(item.storeCount)}</p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                  <span className="font-display text-3xl font-bold tabular-nums">{formatBRL(item.bestPrice)}</span>
                  {unit && (
                    <span className="text-lg font-semibold text-foreground/80 tabular-nums">
                      {formatBRL(unit.value)}
                      {unit.label}
                    </span>
                  )}
                </p>
                <PriceSignalTag item={item} className="mt-2" />
                {worst != null && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    A diferença entre a loja mais barata e a mais cara é de <strong className="text-foreground">{formatBRL(worst - item.bestPrice)}</strong>.
                  </p>
                )}
                <a href="#lojas" className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Ver preços por loja
                </a>
              </>
            ) : (
              <p className="text-sm">Nenhuma loja com esta embalagem disponível agora.</p>
            )}
          </div>

          {sizes.length > 1 && (
            <div className="mt-5">
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
                        className={cn(
                          "flex flex-col rounded-md border px-3 py-2 text-sm transition-colors",
                          current ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/40",
                        )}
                      >
                        <span className="font-display font-semibold tabular-nums">{s.unitCount ? packageLabel(s) : formatWeight(s.netWeightGrams)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {u ? `${formatBRL(u.value)}${u.label}` : "sem oferta"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Section id="lojas" title={`Preços em ${storeCountLabel(item.offers.length)}`} subtitle="Do menor para o maior preço. Nenhuma loja paga para aparecer primeiro.">
        {demo && (
          <p className="mb-3 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-foreground">
            Demonstração: preços ilustrativos. O botão registra o clique, mas ainda não leva a uma loja.
          </p>
        )}
        <ol className="divide-y rounded-lg border">
          {[...available, ...unavailable].map((o, index) => {
            const u = unitPriceOf(item, o.price);
            return (
              <li key={o.id} className={cn("grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:gap-x-5 sm:p-4", !o.inStock && "opacity-60")}>
                <StoreLogo slug={o.storeSlug} size={40} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                    {o.storeName}
                    {index === 0 && o.inStock && <span className="rounded bg-success-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold text-success">Menor preço</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.sellerName !== o.storeName ? `Vendido por ${o.sellerName} · ` : ""}atualizado {timeAgo(o.lastCheckedAt, now)}
                  </p>
                  {o.freeShipping && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-success">
                      <Truck className="size-3.5" aria-hidden /> Frete grátis
                    </p>
                  )}
                </div>
                <div className="col-start-2 sm:col-start-auto sm:text-right">
                  {o.inStock ? (
                    <>
                      <p className="font-display text-lg font-bold tabular-nums">{formatBRL(o.price)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {u && `${formatBRL(u.value)}${u.label}`}
                        {o.pixPrice && ` · Pix ${formatBRL(o.pixPrice)}`}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium">Indisponível</p>
                  )}
                </div>
                <div className="col-start-2 sm:col-start-auto">
                  {o.inStock && (
                    <a
                      href={`/ir/${encodeURIComponent(o.id)}`}
                      rel="sponsored nofollow noopener"
                      target="_blank"
                      className={cn(
                        "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md px-4 text-sm font-semibold transition-colors sm:w-auto",
                        index === 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border bg-card hover:border-foreground/40",
                      )}
                    >
                      Ir à loja <ArrowUpRight className="size-4" aria-hidden />
                      <span className="sr-only">{o.storeName} (abre em nova aba)</span>
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <HelpCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            O preço pode mudar entre a nossa atualização e a sua visita. {siteConfig.affiliateDisclaimer}
          </span>
        </p>
      </Section>

      <Section id="ficha" title="Confira se é a ração certa" subtitle="Compare estes dados com a embalagem que você usa antes de comprar.">
        {item.kind === "medicamentosa" && (
          <p className="mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
            <Stethoscope className="mt-0.5 size-4 shrink-0" aria-hidden /> Alimento de uso veterinário: só troque ou compre com orientação do seu veterinário.
          </p>
        )}
        <dl className="divide-y rounded-lg border">
          <Row label="Marca">
            {item.brand.name}
            {item.lineName && item.lineName !== item.brand.name && ` · ${item.lineName}`}
          </Row>
          <Row label="Fórmula">{item.title}</Row>
          {topics.map((t) => (
            <Row key={t.key} label={t.label}>
              {t.value ?? <span className="text-muted-foreground">Não informado</span>}
            </Row>
          ))}
        </dl>
        {item.description && (
          <div className="mt-4 rounded-lg border p-4">
            <h3 className="font-semibold">Descrição</h3>
            <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-foreground/90">{item.description}</p>
          </div>
        )}
      </Section>

      {sameFormula.length > 0 && (
        <Section id="sabores" title="Mesma fórmula, outros sabores">
          <OtherGrid items={sameFormula} items_all={items} />
        </Section>
      )}
      {sameBrand.length > 0 && (
        <Section id="marca" title={`Outras opções ${item.brand.name} para ${speciesLabel.toLowerCase()}`}>
          <OtherGrid items={sameBrand} items_all={items} />
        </Section>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 px-4 py-2.5 text-sm sm:grid-cols-[11rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function OtherGrid({ items, items_all }: { items: ComparatorItem[]; items_all: ComparatorItem[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => {
        const weights = items_all.filter((x) => x.family === i.family).map((x) => formatWeight(x.netWeightGrams));
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
                    {u && <span className="text-muted-foreground"> · {formatBRL(u.value)}{u.label}</span>}
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

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="mt-12 scroll-mt-24">
      <h2 id={`${id}-titulo`} className="font-display text-xl font-semibold">
        {title}
      </h2>
      {subtitle && <p className="mt-1 mb-4 text-sm text-muted-foreground">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  );
}
