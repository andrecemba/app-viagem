import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/icons/brand-mark";
import { EmptyState } from "@/components/offers/empty-state";
import { ListingCard } from "@/components/offers/listing-card";
import { Button } from "@/components/ui/button";
import { getBrandPage, getBrands } from "@/lib/data";

/** Fase 0: só slugs conhecidos (404 real). Na Fase 1, trocar por ISR com dynamicParams. */
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getBrands()).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/marca/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getBrandPage(slug);
  if (!page) return {};
  return {
    title: `${page.brand.name}: rações e petiscos pelo menor preço`,
    description: `Compare o preço por kg das linhas ${page.brand.name} nas principais lojas.`,
    alternates: { canonical: `/marca/${slug}` },
  };
}

export default async function BrandPage({ params }: PageProps<"/marca/[slug]">) {
  const { slug } = await params;
  const page = await getBrandPage(slug);
  if (!page) notFound();
  const { brand, lines, listings } = page;
  const bySpecies = (["caes", "gatos"] as const)
    .map((sp) => ({ sp, items: listings.filter((l) => l.product.species === sp) }))
    .filter((g) => g.items.length);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-5 rounded-3xl border bg-card p-6 sm:flex-row sm:items-center">
        <BrandMark brand={brand} size={80} />
        <div className="flex-1">
          <h1 className="text-3xl font-black">{brand.name}</h1>
          <p className="mt-1 text-muted-foreground">{brand.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {lines.map((l) => (
              <span key={l.id} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">{l.name}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {brand.species.map((sp) => (
            <Button key={sp} asChild variant="outline" size="sm">
              <Link href={`/${sp}/${brand.slug}`}>{sp === "caes" ? "Cães" : "Gatos"} no funil</Link>
            </Button>
          ))}
        </div>
      </div>
      {brand.logoUrl === null && (
        <p className="mt-2 text-xs text-muted-foreground">Logo provisório — o logo oficial será enviado pelo painel.</p>
      )}

      {bySpecies.length === 0 && <div className="mt-10"><EmptyState title="Sem ofertas desta marca no momento" description="Volte em breve: verificamos os preços a cada 2 dias." /></div>}
      {bySpecies.map(({ sp, items }) => (
        <section key={sp} className="mt-10">
          <h2 className="mb-4 text-2xl font-extrabold">{sp === "caes" ? "Para cães" : "Para gatos"}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((l) => (
              <ListingCard key={l.product.id} listing={l} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
