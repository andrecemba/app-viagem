import { Clock } from "lucide-react";

import { StoreMark } from "@/components/icons/store-mark";
import { OfferBadges } from "@/components/offers/offer-badges";
import { OutboundOfferButton } from "@/components/offers/outbound-offer-button";
import { PriceExtras } from "@/components/offers/price-extras";
import { UnitPriceTag } from "@/components/offers/unit-price";
import { referenceNow } from "@/lib/clock";
import { formatBRL, formatRelativeHours } from "@/lib/format";
import type { OfferView } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/catalog";

/** Todas as lojas lado a lado, na ordem honesta (menor preço unitário primeiro). */
export function OfferComparison({ offers, product }: { offers: OfferView[]; product: Product }) {
  return (
    <ol className="space-y-3">
      {offers.map((v, i) => {
        const unavailable = !v.offer.inStock;
        return (
          <li
            key={v.offer.id}
            className={cn(
              "grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center",
              i === 0 && !unavailable && "border-primary/50 ring-2 ring-primary/15",
              unavailable && "opacity-60",
            )}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {i === 0 && !unavailable && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-extrabold text-primary-foreground">
                    Mais barato
                  </span>
                )}
                <StoreMark store={v.store} />
              </div>
              {v.offer.sellerName !== v.store.name && (
                <p className="text-xs text-muted-foreground">Vendido por {v.offer.sellerName}</p>
              )}
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" aria-hidden /> Verificado {formatRelativeHours(v.offer.lastCheckedAt, referenceNow())}
              </p>
            </div>
            <div>
              <p className="text-lg font-extrabold">{formatBRL(v.offer.price)}</p>
              <PriceExtras offer={v.offer} />
            </div>
            <div className="space-y-1.5">
              <UnitPriceTag unitPrice={v.unitPrice} className="text-xl" />
              {v.unitPrice.perUnit !== null && (
                <p className="text-xs text-muted-foreground">{formatBRL(v.unitPrice.perUnit)} por unidade</p>
              )}
              <OfferBadges badges={v.badges} />
            </div>
            <div className="sm:justify-self-end">
              {unavailable ? (
                <span className="inline-flex h-10 items-center rounded-xl bg-muted px-4 text-sm font-semibold text-muted-foreground">
                  Indisponível
                </span>
              ) : (
                <OutboundOfferButton
                  offerId={v.offer.id}
                  className="w-full sm:w-auto"
                  variant={i === 0 ? "default" : "outline"}
                  drawer={{ productSlug: product.slug, productName: product.name, storeId: v.store.id, storeName: v.store.name }}
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
