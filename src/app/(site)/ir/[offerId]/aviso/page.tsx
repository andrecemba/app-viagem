import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoreLogo } from "@/components/icons/store-logo";
import { getOutboundTarget } from "@/lib/catalog/public";
import { productName } from "@/lib/domain/products";

export const metadata: Metadata = { title: "Oferta indisponível", robots: { index: false, follow: false } };

/** Destino de /ir/<oferta> quando não há link para seguir (oferta de exemplo ou desativada). */
export default async function OutboundNoticePage({ params }: PageProps<"/ir/[offerId]/aviso">) {
  const { offerId } = await params;
  const target = getOutboundTarget(Number(offerId));
  if (!target) notFound();
  const { offer, store, product } = target;
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="flex items-center justify-center gap-2.5 font-display text-2xl font-bold">
        <StoreLogo name={store.name} color={store.color} logo={store.logoUrl} size={36} /> {store.name}
      </h1>
      <p className="mt-3 text-muted-foreground">{productName(product)}</p>
      <p className="mt-6 rounded-lg border bg-muted px-4 py-3 text-sm">
        {offer.isDemo
          ? "Esta é uma oferta de exemplo, com preço fictício de demonstração. Ela não leva a uma loja."
          : "Esta oferta não está mais ativa. Volte para ver as outras lojas."}
      </p>
      <Link href={`/produto/${product.slug}`} className="mt-8 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
        Ver outras lojas
      </Link>
    </div>
  );
}
