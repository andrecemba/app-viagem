import "server-only";

import { cache } from "react";

import { getDb } from "@/lib/db";
import { isStale } from "@/lib/domain/alerts";
import { getOffer, listOffers, pricePoints } from "@/lib/domain/offers";
import { getProduct, listProducts, productName } from "@/lib/domain/products";
import { getSettings } from "@/lib/domain/settings";
import { getStore, listStores } from "@/lib/domain/stores";
import type { Offer, Product, Settings, Store } from "@/lib/domain/types";
import { slugify } from "@/lib/domain/validation";
import type { ComparatorItem, ComparatorOffer } from "@/lib/comparator/types";

import { sizesCovered } from "./vocab";

/** Validade máxima de um preço vindo de API para lojas com regra "somente_api" (Amazon). */
const API_ONLY_MAX_HOURS = 24;

function initials(name: string) {
  const words = name.replace(/[^\p{L}\s&]/gu, " ").split(/\s+/).filter(Boolean);
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

const BRAND_COLORS = ["#1f4e79", "#7c2d12", "#166534", "#6d28d9", "#b45309", "#0f766e", "#be123c", "#374151"];
function brandColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BRAND_COLORS[h % BRAND_COLORS.length];
}

/** Regra de exibição: loja "somente_api" só mostra preço da API oficial e recente. */
export function publicPrice(offer: Offer, store: Store, now = new Date()): { price: number | null; reason: string | null } {
  if (offer.price == null) return { price: null, reason: "Sem preço cadastrado." };
  if (store.priceDisplay === "somente_api") {
    const fromApi = offer.priceSource?.startsWith("api:") && !offer.overrides.price;
    const fresh = offer.priceObtainedAt && now.getTime() - new Date(offer.priceObtainedAt).getTime() <= API_ONLY_MAX_HOURS * 3600_000;
    if (!fromApi || !fresh) return { price: null, reason: `${store.name} só permite mostrar preço obtido pela API oficial.` };
  }
  return { price: offer.price, reason: null };
}

function toPublicOffer(o: Offer, store: Store, settings: Settings, now: Date): ComparatorOffer {
  const { price, reason } = publicPrice(o, store, now);
  // Preço anterior só quando registrado por nós e maior que o atual (queda comprovada).
  const prevOk = price != null && o.previousPrice != null && o.previousPriceAt != null && o.previousPrice > price;
  return {
    id: String(o.id),
    storeSlug: store.id,
    storeName: store.name,
    storeColor: store.color,
    storeLogo: store.logoUrl,
    sellerName: store.name,
    price,
    priceObtainedAt: price != null ? o.priceObtainedAt : null,
    previousPrice: prevOk ? o.previousPrice : null,
    previousPriceAt: prevOk ? o.previousPriceAt : null,
    pixPrice: null,
    availability: o.availability,
    inStock: o.availability !== "indisponivel",
    freeShipping: o.freeShipping,
    listingWeightGrams: o.listingWeightGrams,
    listingFlavor: o.listingFlavor,
    stale: price != null && isStale(o, settings, now),
    isDemo: o.isDemo,
    priceHiddenReason: reason,
    lastCheckedAt: o.lastCheckedAt ?? o.priceObtainedAt ?? o.updatedAt,
  };
}

/** Média do menor preço diário (30 dias), com o preço vigente de cada loja em cada dia. */
function average30d(points: { offerId: number; at: string; price: number }[], now: Date): number | null {
  if (!points.length) return null;
  const values: number[] = [];
  for (let d = 29; d >= 0; d--) {
    const end = new Date(now.getTime() - d * 86400_000).toISOString();
    const current = new Map<number, number>();
    for (const p of points) if (p.at <= end) current.set(p.offerId, p.price);
    if (current.size) values.push(Math.min(...current.values()));
  }
  if (values.length < 7) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

function toItem(p: Product, offers: Offer[], stores: Map<string, Store>, settings: Settings, points: { offerId: number; at: string; price: number }[], now: Date): ComparatorItem {
  const pub = offers
    .filter((o) => stores.get(o.storeId)?.active)
    .map((o) => toPublicOffer(o, stores.get(o.storeId)!, settings, now))
    .sort((a, b) => Number(b.inStock && b.price != null) - Number(a.inStock && a.price != null) || (a.price ?? 1e9) - (b.price ?? 1e9));
  const priced = pub.filter((o) => o.inStock && o.price != null);
  const best = priced[0] ?? null;
  const brandSlug = slugify(p.brand);
  const needs = [...p.needs];
  if (p.neutered && !needs.includes("castrados")) needs.unshift("castrados");
  const updated = pub.map((o) => o.priceObtainedAt).filter(Boolean).sort().at(-1) ?? null;
  const publicIds = new Set(pub.filter((o) => o.price != null).map((o) => Number(o.id)));
  // Sem foto no produto: usa a foto oficial do anúncio que veio pela API ou arquivo da loja,
  // só de oferta ativa, real e com peso e sabor confirmados (nunca de oferta incerta ou de exemplo).
  const listingPhoto =
    offers.find((o) => o.active && !o.isDemo && o.dataSource !== "manual" && o.matchStatus === "confirmada" && o.imageUrl?.startsWith("https://") && stores.get(o.storeId)?.active)
      ?.imageUrl ?? null;
  return {
    id: String(p.id),
    slug: p.slug,
    family: slugify([p.species, p.brand, p.line, p.indication, p.flavor, p.neutered ? "castrado" : ""].filter(Boolean).join(" ")),
    brand: { slug: brandSlug, name: p.brand, color: brandColor(p.brand), initials: initials(p.brand), logo: null },
    lineName: p.line ?? "",
    title: productName({ ...p, flavor: null }, false),
    indication: p.indication,
    species: p.species,
    kind: p.foodType ?? "seca",
    lifeStages: p.lifeStage ? [p.lifeStage] : [],
    sizes: p.species === "caes" ? (p.size ? sizesCovered(p.size) : null) : null,
    needs,
    flavor: p.flavor ?? "",
    netWeightGrams: p.weightGrams,
    unitCount: p.unitCount,
    kibbleSize: null,
    vetNote: p.foodType === "medicamentosa" ? p.indication : null,
    gtin: p.gtin,
    description: p.description,
    photoUrl: p.imageUrl ?? listingPhoto,
    offers: pub,
    bestPrice: best?.price ?? null,
    storeCount: priced.length,
    updatedAt: updated,
    bestPriceStale: best?.stale ?? false,
    avgPrice30d: average30d(points.filter((pt) => publicIds.has(pt.offerId)), now),
    isDemo: p.isDemo || pub.some((o) => o.isDemo),
    demoProduct: p.isDemo,
  };
}

/** Catálogo público: produtos ativos com as ofertas ativas (valores corrigidos pelo admin aplicados). */
export const getCatalog = cache(async (): Promise<ComparatorItem[]> => {
  const db = getDb();
  const now = new Date();
  const settings = getSettings(db);
  const stores = new Map(listStores(db).map((s) => [s.id, s]));
  const offersByProduct = new Map<number, Offer[]>();
  for (const o of listOffers(db, { onlyActive: true })) offersByProduct.set(o.productId, [...(offersByProduct.get(o.productId) ?? []), o]);
  const allIds = [...offersByProduct.values()].flat().map((o) => o.id);
  const points = pricePoints(db, allIds, new Date(now.getTime() - 60 * 86400_000).toISOString());
  const pointsByOffer = new Map<number, typeof points>();
  for (const pt of points) pointsByOffer.set(pt.offerId, [...(pointsByOffer.get(pt.offerId) ?? []), pt]);
  return listProducts(db, { onlyActive: true }).map((p) => {
    const offers = offersByProduct.get(p.id) ?? [];
    return toItem(p, offers, stores, settings, offers.flatMap((o) => pointsByOffer.get(o.id) ?? []), now);
  });
});

export async function getCatalogItem(slug: string) {
  const items = await getCatalog();
  const item = items.find((i) => i.slug === slug);
  return item ? { item, items } : null;
}

export async function findCatalogProduct(idOrSlug: string) {
  return (await getCatalog()).find((i) => i.id === idOrSlug || i.slug === idOrSlug) ?? null;
}

/**
 * Destino de /ir/<oferta>. Só vai para fora com um link salvo e validado
 * (afiliado, senão a URL original) de uma oferta ativa; ofertas de exemplo nunca saem do site.
 */
export function getOutboundTarget(offerId: number): { url: string | null; offer: Offer; store: Store; product: Product; isAffiliate: boolean } | null {
  const db = getDb();
  const offer = getOffer(db, offerId);
  if (!offer) return null;
  const store = getStore(db, offer.storeId)!;
  const product = getProduct(db, offer.productId)!;
  const ok = offer.active && product.active && store.active && !offer.isDemo;
  return { url: ok ? (offer.affiliateUrl ?? offer.url) : null, offer, store, product, isAffiliate: Boolean(offer.affiliateUrl) };
}

export function staleHours() {
  return getSettings(getDb()).staleHours;
}

