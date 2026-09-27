import "server-only";

import {
  buildAffiliateUrl,
  DEMO_AFFILIATE_CONFIG,
  getAffiliateConfigFromEnv,
  mergeAffiliateConfig,
  type AffiliateTagCategory,
} from "@/lib/affiliate";
import { NATURAL_BRANDS } from "@/config/comparator";
import { PACKAGE_RANGES } from "@/config/taxonomy";
import { FILTER_SIZES, type Need } from "@/lib/catalog/vocab";
import type { ComparatorItem, FoodKind } from "@/lib/comparator/types";
import { formatWeight } from "@/lib/format";
import type { FunnelDimension, FunnelSelection, OfferFilters } from "@/lib/funnel/filters";
import { computeOfferBadges } from "@/lib/pricing/badges";
import { rankOffersHonestly } from "@/lib/pricing/rankOffers";
import { computeUnitPrice } from "@/lib/pricing/unitPrice";
import { rankRelated } from "@/lib/related/rankRelated";
import { brands, productLines } from "@/data/mock/brands";
import { categories } from "@/data/mock/categories";
import { complementaryProducts, complementaryRules, complementCategoryLabels } from "@/data/mock/complementary";
import { offers, priceHistory } from "@/data/mock/offers";
import { products } from "@/data/mock/products";
import { stores } from "@/data/mock/stores";
import { MOCK_NOW } from "@/data/mock/random";
import type { Offer, Product, Store } from "@/types/catalog";

import type {
  DataSource,
  MonthlyKitItem,
  OfferView,
  ProductListing,
  RelatedItemView,
  StoreHistory,
} from "./types";

const affiliateConfig = mergeAffiliateConfig(DEMO_AFFILIATE_CONFIG, getAffiliateConfigFromEnv());

const storeById = new Map(stores.map((s) => [s.id, s]));
const brandById = new Map(brands.map((b) => [b.id, b]));
const lineById = new Map(productLines.map((l) => [l.id, l]));
const productById = new Map(products.map((p) => [p.id, p]));
const productBySlug = new Map(products.map((p) => [p.slug, p]));
const historyByOffer = new Map(priceHistory.map((h) => [h.offerId, h.points]));

/** Só ofertas aprovadas aparecem no site (outliers ficam na fila de revisão). */
const publicOffers = offers.filter((o) => o.status === "active");
const offersByProduct = new Map<string, Offer[]>();
for (const o of publicOffers) {
  const list = offersByProduct.get(o.productId) ?? [];
  list.push(o);
  offersByProduct.set(o.productId, list);
}

function tagCategoryFor(product: Product): AffiliateTagCategory {
  return product.foodType === "petiscos" ? "petisco" : "racao";
}

function affiliateFor(offer: Offer, product: Product) {
  const store = storeById.get(offer.storeId)!;
  return buildAffiliateUrl(
    {
      url: offer.url,
      storeSlug: store.slug,
      network: store.affiliateNetwork,
      apiUrl: offer.affiliateApiUrl,
      manualUrl: offer.affiliateManualUrl,
      tagCategory: tagCategoryFor(product),
    },
    affiliateConfig,
  );
}

function hasCommission(offer: Offer, product: Product) {
  return (offer.commissionRate ?? 0) > 0 && affiliateFor(offer, product).affiliateStatus === "ok";
}

function toView(offer: Offer, product: Product): OfferView {
  const history = historyByOffer.get(offer.id) ?? [];
  return {
    offer,
    store: storeById.get(offer.storeId)!,
    unitPrice: computeUnitPrice(offer.price, product.netWeightGrams, product.format, product.unitCount),
    badges: computeOfferBadges(offer.price, history, offer.freeShipping),
  };
}

function rankViews(views: OfferView[], product: Product) {
  const available = views.filter((v) => v.offer.inStock);
  const unavailable = views.filter((v) => !v.offer.inStock);
  const ranked = rankOffersHonestly(
    available.map((v) => ({ v, unitPrice: v.unitPrice.value, hasCommission: hasCommission(v.offer, product) })),
  ).map((r) => r.v);
  return [...ranked, ...unavailable.sort((a, b) => a.unitPrice.value - b.unitPrice.value)];
}

function matchesSelection(p: Product, f: FunnelSelection & OfferFilters) {
  if (f.species && p.species !== f.species) return false;
  if (f.foodType && p.foodType !== f.foodType) return false;
  if (f.lifeStage && !p.lifeStages.includes(f.lifeStage)) return false;
  if (f.size && p.sizes.length && !p.sizes.includes(f.size)) return false;
  if (f.segment && p.segment !== f.segment) return false;
  if (f.brand && brandById.get(p.brandId)?.slug !== f.brand) return false;
  if (f.refinements?.length && !f.refinements.every((r) => p.refinements.includes(r))) return false;
  if (f.packageRange) {
    const range = PACKAGE_RANGES.find((r) => r.slug === f.packageRange)!;
    if (p.netWeightGrams < range.min || p.netWeightGrams > range.max) return false;
  }
  return true;
}

function listingFor(product: Product, storeSlugs?: string[]): ProductListing | null {
  let productOffers = (offersByProduct.get(product.id) ?? []).filter((o) => o.inStock);
  if (storeSlugs?.length) {
    productOffers = productOffers.filter((o) => storeSlugs.includes(storeById.get(o.storeId)!.slug));
  }
  if (!productOffers.length) return null;
  const ranked = rankViews(productOffers.map((o) => toView(o, product)), product);
  return {
    product,
    brand: brandById.get(product.brandId)!,
    line: lineById.get(product.lineId),
    best: ranked[0],
    offerCount: ranked.length,
    maxPrice: Math.max(...ranked.map((v) => v.offer.price)),
  };
}

function listings(filters: OfferFilters): ProductListing[] {
  const result = products
    .filter((p) => matchesSelection(p, filters))
    .map((p) => listingFor(p, filters.storeSlugs))
    .filter((l): l is ProductListing => l !== null);

  if (filters.sort === "total") return result.sort((a, b) => a.best.offer.price - b.best.offer.price);
  return rankOffersHonestly(
    result.map((l) => ({ l, unitPrice: l.best.unitPrice.value, hasCommission: hasCommission(l.best.offer, l.product) })),
  ).map((r) => r.l);
}

function relatedFor(product: Product, storeId?: string, sameStoreOnly = false, limit = 8): RelatedItemView[] {
  return rankRelated(
    { species: product.species, foodType: product.foodType, lifeStages: product.lifeStages },
    complementaryProducts,
    complementaryRules,
    { storeId, sameStoreOnly, limit },
  ).map((r) => ({
    id: r.item.id,
    name: r.item.name,
    category: r.item.category,
    categoryLabel: complementCategoryLabels[r.item.category],
    offerId: r.offer.id,
    price: r.offer.price,
    store: storeById.get(r.offer.storeId)!,
    sameStore: r.sameStore,
  }));
}

function kindOf(product: Product): FoodKind | null {
  if (product.foodType === "petiscos") return null;
  if (product.foodType === "dietas-veterinarias") return "medicamentosa";
  if (product.foodType === "racao-umida") return "umida";
  return NATURAL_BRANDS.has(brandById.get(product.brandId)!.slug) ? "natural" : "seca";
}

/** Nome da fórmula sem o peso que o seed acrescenta ao final. */
function titleOf(product: Product) {
  const suffix = ` ${formatWeight(product.netWeightGrams)}`;
  return product.unitCount == null && product.name.endsWith(suffix) ? product.name.slice(0, -suffix.length) : product.name;
}

const REFINEMENT_NEED: Record<Product["refinements"][number], Need> = {
  "sem-corante": "sem_corantes",
  "grain-free": "sem_graos",
  light: "controle_peso",
  "pele-sensivel": "pele_sensivel",
};

/** Média do menor preço do dia nos últimos 30 dias (histórico ilustrativo). */
function averageBestPrice(productOffers: Offer[]): number | null {
  const since = new Date(MOCK_NOW.getTime() - 30 * 86400_000).toISOString().slice(0, 10);
  const minByDay = new Map<string, number>();
  for (const o of productOffers) {
    for (const point of historyByOffer.get(o.id) ?? []) {
      if (point.date < since) continue;
      minByDay.set(point.date, Math.min(minByDay.get(point.date) ?? Infinity, point.price));
    }
  }
  if (minByDay.size < 5) return null;
  const values = [...minByDay.values()];
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

function comparatorItemFor(product: Product): ComparatorItem | null {
  const kind = kindOf(product);
  const productOffers = offersByProduct.get(product.id) ?? [];
  if (!kind || !productOffers.length) return null;
  const brand = brandById.get(product.brandId)!;
  const sorted = [...productOffers].sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price);
  const available = sorted.filter((o) => o.inStock);
  if (!available.length) return null;
  const stages = product.lifeStages.filter((s): s is Exclude<typeof s, "castrado"> => s !== "castrado");
  const needs: Need[] = product.refinements.map((r) => REFINEMENT_NEED[r]);
  if (product.lifeStages.includes("castrado")) needs.unshift("castrados");
  return {
    id: product.id,
    slug: product.slug,
    family: product.variantGroup,
    brand: { slug: brand.slug, name: brand.name, color: brand.color, initials: brand.initials, logo: brand.logoUrl },
    lineName: lineById.get(product.lineId)?.name ?? "",
    title: titleOf(product),
    species: product.species,
    kind,
    // Dados de exemplo: produtos só "castrados" são de gatos/cães adultos.
    lifeStages: stages.length ? stages : ["adulto"],
    sizes: product.species === "caes" ? (product.sizes.length ? product.sizes : [...FILTER_SIZES]) : null,
    needs,
    flavor: product.flavor,
    netWeightGrams: product.netWeightGrams,
    unitCount: product.unitCount,
    kibbleSize: null,
    vetNote: kind === "medicamentosa" ? "Dieta terapêutica" : null,
    gtin: product.ean,
    description: null,
    // Nenhuma foto oficial verificada nos dados de exemplo.
    photoUrl: null,
    offers: sorted.map((o) => {
      const store = storeById.get(o.storeId)!;
      return {
        id: o.id,
        storeSlug: store.slug,
        storeName: store.name,
        sellerName: o.sellerName,
        price: o.price,
        pixPrice: o.pixPrice,
        freeShipping: o.freeShipping,
        inStock: o.inStock,
        lastCheckedAt: o.lastCheckedAt,
      };
    }),
    bestPrice: available[0].price,
    storeCount: available.length,
    avgPrice30d: averageBestPrice(productOffers),
  };
}

/** Simula latência de rede para exercitar os estados de carregamento. */
const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockSource: DataSource = {
  async getCategories() {
    return categories;
  },

  async getStores() {
    return stores;
  },

  async getBrands(species) {
    const withProducts = new Set(products.filter((p) => !species || p.species === species).map((p) => p.brandId));
    return brands.filter((b) => withProducts.has(b.id)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  async getBrandPage(slug) {
    const brand = brands.find((b) => b.slug === slug);
    if (!brand) return null;
    return {
      brand,
      lines: productLines.filter((l) => l.brandId === brand.id),
      listings: listings({ brand: slug }),
    };
  },

  async getOffers(filters) {
    await delay();
    return listings(filters);
  },

  async getFunnelCounts(filters, dimension: FunnelDimension) {
    const base = { ...filters, [dimension]: undefined };
    const counts: Record<string, number> = {};
    for (const p of products) {
      if (!matchesSelection(p, base)) continue;
      const l = listingFor(p, filters.storeSlugs);
      if (!l) continue;
      const keys: string[] =
        dimension === "brand"
          ? [brandById.get(p.brandId)!.slug]
          : dimension === "lifeStage"
            ? p.lifeStages
            : dimension === "size"
              ? p.sizes.length ? p.sizes : ["mini", "pequeno", "medio", "grande"]
              : [p[dimension] as string];
      for (const k of keys) counts[k] = (counts[k] ?? 0) + l.offerCount;
      counts.__all = (counts.__all ?? 0) + l.offerCount;
    }
    return counts;
  },

  async getTopDeals(selection, limit) {
    return listings({ ...selection }).slice(0, limit);
  },

  async getProduct(slug) {
    await delay();
    const product = productBySlug.get(slug);
    if (!product) return null;
    const views = rankViews((offersByProduct.get(product.id) ?? []).map((o) => toView(o, product)), product);
    const history: StoreHistory[] = views.map((v) => ({
      storeId: v.store.id,
      storeName: v.store.name,
      color: v.store.color,
      points: historyByOffer.get(v.offer.id) ?? [],
    }));
    const variants = products
      .filter((p) => p.variantGroup === product.variantGroup)
      .map((p) => listingFor(p))
      .filter((l): l is ProductListing => l !== null)
      .sort((a, b) => a.product.netWeightGrams - b.product.netWeightGrams);
    return {
      product,
      brand: brandById.get(product.brandId)!,
      line: lineById.get(product.lineId),
      offers: views,
      history,
      variants,
    };
  },

  async getRelated(productSlug, storeId, options) {
    const product = productBySlug.get(productSlug);
    if (!product) return [];
    return relatedFor(product, storeId, options?.sameStoreOnly, options?.limit);
  },

  async getMonthlyKit(productSlug) {
    const product = productBySlug.get(productSlug);
    if (!product || product.foodType === "petiscos" || product.foodType === "dietas-veterinarias") return null;
    const main = listingFor(product);
    if (!main) return null;
    const storeId = main.best.store.id;
    const items: MonthlyKitItem[] = [
      {
        role: product.format === "wet" ? "Ração úmida" : "Ração",
        name: product.name,
        offerId: main.best.offer.id,
        price: main.best.offer.price,
        store: main.best.store,
        href: `/produto/${product.slug}`,
      },
    ];

    // Petisco do próprio catálogo, preferindo a mesma loja da ração.
    const snack = products
      .filter((p) => p.species === product.species && p.foodType === "petiscos")
      .map((p) => {
        const sameStore = (offersByProduct.get(p.id) ?? []).find((o) => o.storeId === storeId && o.inStock);
        const l = listingFor(p);
        return l ? { p, offer: sameStore ?? l.best.offer } : null;
      })
      .filter((x): x is { p: Product; offer: Offer } => x !== null)
      .sort((a, b) => Number(b.offer.storeId === storeId) - Number(a.offer.storeId === storeId) || a.offer.price - b.offer.price)[0];
    if (snack) {
      items.push({
        role: "Petisco",
        name: snack.p.name,
        offerId: snack.offer.id,
        price: snack.offer.price,
        store: storeById.get(snack.offer.storeId)!,
        href: `/produto/${snack.p.slug}`,
      });
    }

    const essentialCategory =
      product.species === "gatos" ? "areia-sanitaria" : product.lifeStages.includes("filhote") ? "tapete-higienico" : "saquinho-fezes";
    const essential = relatedFor(product, storeId, false, 30).find((r) => r.category === essentialCategory);
    if (essential) {
      items.push({
        role: complementCategoryLabels[essential.category],
        name: essential.name,
        offerId: essential.offerId,
        price: essential.price,
        store: essential.store,
        href: null,
      });
    }
    return { items, total: Math.round(items.reduce((sum, i) => sum + i.price, 0) * 100) / 100 };
  },

  async getOutboundTarget(offerId) {
    const offer = offers.find((o) => o.id === offerId && o.status === "active");
    if (offer) {
      const product = productById.get(offer.productId)!;
      return {
        offerId,
        kind: "offer",
        productName: product.name,
        store: storeById.get(offer.storeId)!,
        price: offer.price,
        affiliate: affiliateFor(offer, product),
        commissionRate: offer.commissionRate,
      };
    }
    for (const item of complementaryProducts) {
      const co = item.offers.find((o) => o.id === offerId);
      if (!co) continue;
      const store: Store = storeById.get(co.storeId)!;
      return {
        offerId,
        kind: "complementary",
        productName: item.name,
        store,
        price: co.price,
        affiliate: buildAffiliateUrl(
          { url: co.url, storeSlug: store.slug, network: store.affiliateNetwork, tagCategory: "complementar" },
          affiliateConfig,
        ),
        commissionRate: co.commissionRate,
      };
    }
    return null;
  },

  async getCalculatorProducts() {
    return products
      .filter((p) => p.format === "dry" && p.foodType !== "dietas-veterinarias")
      .map((p) => ({ p, l: listingFor(p) }))
      .filter((x): x is { p: Product; l: ProductListing } => x.l !== null)
      .map(({ p, l }) => ({
        slug: p.slug,
        name: p.name,
        species: p.species,
        netWeightGrams: p.netWeightGrams,
        bestPrice: l.best.offer.price,
        storeName: l.best.store.name,
        storePreposition: l.best.store.preposition,
        feedingTable: p.feedingTable,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  async getProductSlugs() {
    return products.map((p) => p.slug);
  },

  async getComparatorItems() {
    return products.map(comparatorItemFor).filter((i): i is ComparatorItem => i !== null);
  },
};
