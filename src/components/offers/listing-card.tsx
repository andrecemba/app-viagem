import Link from "next/link";
import { ChevronRight, Stethoscope } from "lucide-react";

import { StoreMark } from "@/components/icons/store-mark";
import { ProductThumb } from "@/components/product/product-thumb";
import { Badge } from "@/components/ui/badge";
import { SEGMENTS, labelFor } from "@/config/taxonomy";
import { formatBRL } from "@/lib/format";
import type { ProductListing } from "@/lib/data/types";

import { OfferBadges } from "./offer-badges";
import { OutboundOfferButton } from "./outbound-offer-button";
import { PriceExtras } from "./price-extras";
import { UnitPriceTag } from "./unit-price";

export function ListingCard({ listing, rank }: { listing: ProductListing; rank?: number }) {
  const { product, brand, best } = listing;
  const others = listing.offerCount - 1;
  return (
    <article className="group relative flex gap-4 rounded-2xl border bg-card p-4 shadow-xs transition hover:border-primary/40 hover:shadow-md">
      {rank !== undefined && rank < 3 && (
        <span className="absolute -top-2.5 -left-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[11px] font-extrabold text-primary-foreground shadow">
          {rank + 1}º
        </span>
      )}
      <Link href={`/produto/${product.slug}`} className="w-24 shrink-0 sm:w-28" tabIndex={-1} aria-hidden>
        <ProductThumb product={product} brand={brand} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{brand.name}</p>
          <h3 className="line-clamp-2 font-display text-base leading-snug font-bold">
            <Link href={`/produto/${product.slug}`} className="after:absolute after:inset-0 hover:text-primary">
              {product.name}
            </Link>
          </h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="accent">{labelFor(SEGMENTS, product.segment)}</Badge>
            {product.foodType === "dietas-veterinarias" && (
              <Badge variant="warning">
                <Stethoscope aria-hidden /> Orientação veterinária
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="space-y-1">
            <UnitPriceTag unitPrice={best.unitPrice} />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{formatBRL(best.offer.price)}</strong> {best.store.preposition} <StoreMark store={best.store} />
              {best.unitPrice.perUnit !== null && <> · {formatBRL(best.unitPrice.perUnit)}/un.</>}
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <OutboundOfferButton
              offerId={best.offer.id}
              size="sm"
              drawer={{ productSlug: product.slug, productName: product.name, storeId: best.store.id, storeName: best.store.name }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <OfferBadges badges={best.badges} className="contents" />
            <PriceExtras offer={best.offer} />
          </div>
          {others > 0 && (
            <Link
              href={`/produto/${product.slug}`}
              className="relative z-10 inline-flex items-center text-xs font-bold text-primary hover:underline"
            >
              Comparar {others} {others === 1 ? "loja" : "lojas"} <ChevronRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
