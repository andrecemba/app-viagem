import type { ComparatorItem, FoodKind } from "@/lib/comparator/types";
import type { LifeStageSlug, SizeSlug } from "@/types/catalog";

import type { AdminDb, AdminProduct, DogSize } from "./types";

const SIZE_MAP: Record<DogSize, SizeSlug[]> = {
  mini: ["mini"],
  pequeno: ["pequeno"],
  medio: ["medio"],
  grande: ["grande"],
  mini_pequeno: ["mini", "pequeno"],
  medio_grande: ["medio", "grande"],
  todos: [],
};

/** Converte a ficha administrativa no formato do cartão público (só ofertas reais, visíveis e disponíveis). */
export function toComparatorItem(db: AdminDb, p: AdminProduct): ComparatorItem {
  const f = p.fields;
  const offers = db.offers.filter(
    (o) => o.productId === p.id && !o.demo && !o.hidden && o.fields.availability.value === "disponivel" && o.fields.price.value,
  );
  const stage = f.lifeStage.value;
  const lifeStages: LifeStageSlug[] = stage === "castrado" ? ["castrado", "adulto"] : stage && stage !== "todas" ? [stage] : ["adulto"];
  const brand = f.brand.value ?? "Marca não informada";
  return {
    id: p.id,
    slug: p.id,
    family: p.id,
    brand: { slug: brand.toLowerCase(), name: brand, color: "#6b7280", initials: brand.slice(0, 2).toUpperCase() },
    lineName: f.line.value ?? "",
    title: f.formula.value ?? "Fórmula não informada",
    species: f.species.value ?? "caes",
    kind: (f.foodType.value ?? "seca") as FoodKind,
    format: f.foodType.value === "umida" ? "wet" : "dry",
    lifeStages,
    sizes: f.size.value ? SIZE_MAP[f.size.value] : [],
    flavor: f.flavor.value ?? "",
    netWeightGrams: f.weightGrams.value ?? 0,
    unitCount: null,
    photoUrl: p.imageStatus === "quebrada" ? null : f.imageUrl.value,
    offers: [],
    bestPrice: offers.length ? Math.min(...offers.map((o) => o.fields.price.value!)) : 0,
    storeCount: offers.length,
  };
}
