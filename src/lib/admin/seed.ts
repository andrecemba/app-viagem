import { SEED_CHECKED_AT, SEED_CHECKED_HOW, seedProducts, type SeedProduct } from "@/data/admin/seed-products";
import { defaultStores } from "@/data/admin/stores";

import { emptyField, fieldFrom } from "./fields";
import type { AdminDb, AdminProduct, HistoryEvent, ProductFields } from "./types";

const SOURCE = "Cadastro inicial (busca na web)";

export function productFromSeed(seed: SeedProduct, now: string): AdminProduct {
  const v = (key: NonNullable<SeedProduct["pending"]>[number]) =>
    seed.pending?.includes(key) ? ("pendente" as const) : ("fonte_localizada" as const);
  const f = <T,>(value: T | null, verification: "fonte_localizada" | "pendente" = "fonte_localizada") =>
    fieldFrom<T>(value, SOURCE, SEED_CHECKED_AT, verification);

  const fields: ProductFields = {
    brand: f(seed.brand),
    line: f(seed.line),
    formula: f(seed.formula, v("formula")),
    species: f(seed.species),
    lifeStage: f(seed.lifeStage, v("lifeStage")),
    size: seed.species === "gatos" ? emptyField("fonte_localizada") : f(seed.size, v("size")),
    flavor: f(seed.flavor, v("flavor")),
    weightGrams: f(seed.weightGrams, v("weightGrams")),
    foodType: f(seed.foodType),
    gtin: emptyField(),
    manufacturerSku: emptyField(),
    vetIndication: seed.vetIndication ? f(seed.vetIndication) : emptyField(seed.foodType === "medicamentosa" ? "pendente" : "fonte_localizada"),
    kibbleSize: emptyField(),
    description: emptyField(),
    imageUrl: emptyField(),
  };
  // Porte de gato: "não se aplica" não é uma pendência.
  if (seed.species === "gatos") fields.size = { ...fields.size, verification: "fonte_localizada" };

  return {
    id: `prd-${seed.key}`,
    status: "rascunho",
    fields,
    sources: seed.sources.map((s) => ({ ...s, checkedHow: SEED_CHECKED_HOW, checkedAt: SEED_CHECKED_AT })),
    verificationNote: seed.note ?? "",
    imageStatus: "ausente",
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialDb(now = new Date().toISOString()): AdminDb {
  const products = seedProducts.map((s) => productFromSeed(s, now));
  const history: HistoryEvent[] = products.map((p) => ({
    id: `his-seed-${p.id}`,
    at: now,
    entity: "product",
    entityId: p.id,
    productId: p.id,
    offerId: null,
    type: "criacao",
    result: "ok",
    actor: "sistema",
    message: "Ficha criada no cadastro inicial a partir de fontes localizadas por busca na web. Revisar antes de publicar.",
  }));
  return {
    version: 1,
    settings: { demoMode: false, priceOutlierUp: 0.35, priceOutlierDown: 0.3, failuresBeforeAlert: 3 },
    stores: defaultStores,
    products,
    offers: [],
    history,
    alerts: [],
    runs: [],
  };
}
