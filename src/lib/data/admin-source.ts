import "server-only";

import { storeInfo } from "@/config/stores";
import { adminRepo } from "@/lib/admin/repository";
import { slugify } from "@/lib/admin/text";
import type { AdminOffer, AdminProduct } from "@/lib/admin/types";
import { sizesCovered } from "@/lib/catalog/vocab";
import type { ComparatorItem } from "@/lib/comparator/types";

/** Cor estável para o selo da marca enquanto não houver logotipo. */
const BRAND_COLORS = ["#1f4e79", "#7c2d12", "#166534", "#6d28d9", "#b45309", "#0f766e", "#be123c", "#374151"];

function brandColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BRAND_COLORS[h % BRAND_COLORS.length];
}

function initials(name: string) {
  const words = name.replace(/[^\p{L}\s&]/gu, " ").split(/\s+/).filter(Boolean);
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

/** Média do menor preço diário nos últimos 30 dias (preço vigente de cada loja em cada dia). */
export function averageBestPrice(offers: AdminOffer[], now = new Date()): number | null {
  const dayMs = 86400_000;
  const values: number[] = [];
  for (let d = 29; d >= 0; d--) {
    const end = new Date(now.getTime() - d * dayMs).toISOString();
    let min = Infinity;
    for (const o of offers) {
      const point = o.history.filter((h) => h.at <= end).at(-1);
      if (point) min = Math.min(min, point.price);
    }
    if (min < Infinity) values.push(min);
  }
  if (values.length < 7) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function adminProductToItem(p: AdminProduct): ComparatorItem | null {
  if (p.status !== "publicado" || !p.brand || !p.formula || !p.species || !p.lifeStage || !p.foodType || !p.weightGrams) return null;
  const offers = p.offers
    .filter((o): o is AdminOffer & { price: number } => o.price != null)
    .map((o) => ({
      id: o.id,
      storeSlug: o.store,
      storeName: storeInfo(o.store).name,
      sellerName: o.sellerName ?? storeInfo(o.store).name,
      price: o.price,
      pixPrice: null,
      freeShipping: false,
      inStock: o.available,
      lastCheckedAt: o.updatedAt,
    }))
    .sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price);
  const available = offers.filter((o) => o.inStock);
  return {
    id: p.id,
    slug: p.slug,
    family: slugify([p.brand, p.line, p.formula, p.flavor, p.species].filter(Boolean).join(" ")),
    brand: { slug: slugify(p.brand), name: p.brand, color: brandColor(p.brand), initials: initials(p.brand), logo: null },
    lineName: p.line ?? "",
    title: [p.line && p.line !== p.brand ? p.line : null, p.formula].filter(Boolean).join(" "),
    species: p.species,
    kind: p.foodType,
    lifeStages: [p.lifeStage],
    sizes: p.species === "caes" ? (p.size ? sizesCovered(p.size) : null) : null,
    needs: p.needs,
    flavor: p.flavor ?? "",
    netWeightGrams: p.weightGrams,
    unitCount: p.unitCount,
    kibbleSize: p.kibbleSize,
    vetNote: p.vetNote,
    gtin: p.gtin,
    description: p.description,
    photoUrl: p.imageUrl,
    offers,
    bestPrice: available.length ? available[0].price : null,
    storeCount: available.length,
    avgPrice30d: averageBestPrice(p.offers.filter((o) => o.available)),
  };
}

export async function adminCatalog(): Promise<ComparatorItem[]> {
  const db = await adminRepo.read();
  return db.products.map(adminProductToItem).filter((i): i is ComparatorItem => i !== null);
}

export async function adminOfferUrl(offerId: string): Promise<string | null> {
  const db = await adminRepo.read();
  for (const p of db.products) {
    const o = p.offers.find((x) => x.id === offerId);
    if (o) return p.status === "publicado" && o.available ? o.url : null;
  }
  return null;
}
