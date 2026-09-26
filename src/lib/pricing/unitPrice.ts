import type { FoodFormat } from "@/types/catalog";

export interface UnitPrice {
  /** Valor na métrica principal (R$/kg para seca; R$/100 g para úmida e petiscos). */
  value: number;
  metric: "kg" | "100g";
  label: string;
  /** R$ por unidade (sachê, lata, petisco), quando a embalagem informa unidades. */
  perUnit: number | null;
}

export function metricFor(format: FoodFormat): UnitPrice["metric"] {
  return format === "dry" ? "kg" : "100g";
}

export function computeUnitPrice(
  price: number,
  netWeightGrams: number,
  format: FoodFormat,
  unitCount: number | null = null,
): UnitPrice {
  if (!(netWeightGrams > 0)) throw new Error("Peso líquido inválido");
  const metric = metricFor(format);
  const value = metric === "kg" ? (price / netWeightGrams) * 1000 : (price / netWeightGrams) * 100;
  return {
    value: Math.round(value * 100) / 100,
    metric,
    label: metric === "kg" ? "/kg" : "/100 g",
    perUnit: unitCount && unitCount > 0 ? Math.round((price / unitCount) * 100) / 100 : null,
  };
}
