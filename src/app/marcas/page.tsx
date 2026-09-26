import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/icons/brand-mark";
import { getBrands } from "@/lib/data";

export const metadata: Metadata = {
  title: "Marcas",
  description: "Todas as marcas de ração e petiscos comparadas.",
};

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-black sm:text-4xl">Marcas</h1>
      <p className="mt-2 text-muted-foreground">Escolha uma marca para ver todas as linhas e o menor preço de cada produto.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {brands.map((b) => (
          <Link
            key={b.slug}
            href={`/marca/${b.slug}`}
            className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <BrandMark brand={b} size={56} />
            <span className="font-display font-bold">{b.name}</span>
            <span className="text-xs text-muted-foreground">{b.species.map((s) => (s === "caes" ? "Cães" : "Gatos")).join(" · ")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
