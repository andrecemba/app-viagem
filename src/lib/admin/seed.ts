import { SEED_CHECKED_HOW, seedProducts, type SeedProduct } from "@/data/admin/seed-products";

import { slugify } from "./text";
import type { AdminDb, AdminProduct, LifeStage, Need } from "./types";

/**
 * Converte o cadastro inicial para o modelo atual. Só usa o que está na fonte:
 * campos pendentes ou ausentes ficam vazios ("Pendente de verificação").
 */
export function productFromSeed(seed: SeedProduct, now: string): AdminProduct {
  const pending = new Set(seed.pending ?? []);
  const keep = <T,>(key: NonNullable<SeedProduct["pending"]>[number], value: T | null) => (pending.has(key) ? null : value);
  const mentionsAdult = /adult/i.test([seed.formula, ...seed.sources.map((s) => s.evidence)].join(" "));

  let lifeStage: LifeStage | null;
  const needs: Need[] = [];
  if (seed.lifeStage === "castrado") {
    needs.push("castrados");
    lifeStage = mentionsAdult ? "adulto" : null;
  } else {
    lifeStage = seed.lifeStage;
  }

  return {
    id: `prd-${seed.key}`,
    slug: seed.key,
    status: "rascunho",
    brand: seed.brand,
    line: seed.line,
    formula: keep("formula", seed.formula),
    flavor: keep("flavor", seed.flavor),
    species: seed.species,
    lifeStage: keep("lifeStage", lifeStage),
    size: seed.species === "gatos" ? null : keep("size", seed.size),
    foodType: seed.foodType,
    vetNote: seed.vetIndication,
    weightGrams: keep("weightGrams", seed.weightGrams),
    unitCount: null,
    needs,
    kibbleSize: null,
    description: null,
    gtin: null,
    sku: null,
    imageUrl: null,
    sources: seed.sources.map((s) => ({ url: s.url, note: `${s.kind === "fabricante" ? "Fabricante" : "Loja"} · ${s.evidence}` })),
    note: [seed.note, pending.size ? `Pendente por divergência entre fontes: ${[...pending].join(", ")}.` : "", SEED_CHECKED_HOW].filter(Boolean).join("\n"),
    verified: false,
    offers: [],
    createdAt: now,
    updatedAt: now,
    updatedBy: "sistema",
  };
}

export function createInitialDb(now = new Date().toISOString()): AdminDb {
  const products = seedProducts.map((s) => productFromSeed(s, now));
  for (const p of products) p.slug = slugify(p.slug);
  return { version: 2, products, settings: { conversionRate: null, commission: {} } };
}
