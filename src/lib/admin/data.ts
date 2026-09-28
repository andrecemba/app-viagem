import "server-only";

import type { Db } from "@/lib/db";
import { offerAlerts, type OfferAlert } from "@/lib/domain/alerts";
import { listOffers } from "@/lib/domain/offers";
import { listProducts, productName } from "@/lib/domain/products";
import { getSettings } from "@/lib/domain/settings";
import { listStores } from "@/lib/domain/stores";
import type { Offer, Product, Store } from "@/lib/domain/types";

import type { ProductRow } from "./product-list";

export interface OfferRow {
  offer: Offer;
  product: Product;
  store: Store;
  alerts: OfferAlert[];
}

/** Ofertas com produto, loja e alertas calculados agora. */
export function offerRows(db: Db, opts: { productId?: number } = {}): OfferRow[] {
  const settings = getSettings(db);
  const now = new Date();
  const stores = new Map(listStores(db).map((s) => [s.id, s]));
  const products = new Map(listProducts(db).map((p) => [p.id, p]));
  return listOffers(db, { productId: opts.productId }).map((offer) => {
    const product = products.get(offer.productId)!;
    const store = stores.get(offer.storeId)!;
    return { offer, product, store, alerts: product.active ? offerAlerts(offer, product, store, settings, now) : [] };
  });
}

export function productRows(db: Db): ProductRow[] {
  const byProduct = new Map<number, OfferRow[]>();
  for (const r of offerRows(db)) byProduct.set(r.product.id, [...(byProduct.get(r.product.id) ?? []), r]);
  return listProducts(db).map((p) => {
    const rows = (byProduct.get(p.id) ?? []).filter((r) => r.offer.active);
    const prices = rows.filter((r) => r.offer.price != null && r.offer.availability !== "indisponivel").map((r) => r.offer.price!);
    return {
      id: p.id,
      label: productName(p),
      brand: p.brand,
      species: p.species,
      weightGrams: p.weightGrams,
      active: p.active,
      isDemo: p.isDemo,
      offerCount: rows.length,
      pricedCount: prices.length,
      bestPrice: prices.length ? Math.min(...prices) : null,
      alertKinds: [...new Set(rows.flatMap((r) => r.alerts.map((a) => a.kind)))],
      gtin: p.gtin,
      updatedAt: p.updatedAt,
    };
  });
}
