import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";

import { StoreLogo } from "@/components/icons/store-logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getOutboundOffer, getOutboundTarget } from "@/lib/data";
import { formatBRL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Oferta ilustrativa",
  robots: { index: false, follow: false },
};

/** Destino de /ir/<oferta> quando não há link real de loja (dados de exemplo). */
export default async function OutboundNoticePage({ params }: PageProps<"/ir/[offerId]/aviso">) {
  const { offerId } = await params;
  const id = decodeURIComponent(offerId);
  const found = await getOutboundOffer(id);
  const legacy = found ? null : await getOutboundTarget(id);
  if (!found && !legacy) notFound();

  const storeSlug = found?.offer.storeSlug ?? legacy!.store.slug;
  const storeName = found?.offer.storeName ?? legacy!.store.name;
  const productName = found ? [found.item.brand.name, found.item.title, found.item.flavor].filter(Boolean).join(" · ") : legacy!.productName;
  const price = found?.offer.price ?? legacy!.price;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">Oferta ilustrativa em</p>
      <h1 className="mt-3 flex items-center justify-center gap-2.5 font-display text-2xl font-bold">
        <StoreLogo slug={storeSlug} size={36} /> {storeName}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {productName} · <strong className="text-foreground">{formatBRL(price)}</strong>
      </p>
      <Button size="lg" variant="outline" className="mt-8" disabled>
        Link da loja em breve
      </Button>
      <p className="mt-3 text-sm text-muted-foreground">
        Nesta demonstração os preços são ilustrativos e ainda não há links de compra ativos.
      </p>
      <p className="mx-auto mt-6 flex max-w-md items-start gap-2 text-left text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {siteConfig.affiliateDisclaimer}
      </p>
      {found && (
        <p className="mt-8 text-sm">
          <Link href={`/produto/${found.item.slug}`} className="font-medium underline underline-offset-4">
            Voltar para a ração
          </Link>
        </p>
      )}
    </div>
  );
}
