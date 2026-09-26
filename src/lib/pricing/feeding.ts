import type { FeedingRow } from "@/types/catalog";

/** Interpola linearmente a tabela de consumo da embalagem (extrapola pelas pontas). */
export function gramsPerDayFor(table: FeedingRow[], petWeightKg: number): number | null {
  if (!table.length || !(petWeightKg > 0)) return null;
  const rows = [...table].sort((a, b) => a.petWeightKg - b.petWeightKg);
  if (rows.length === 1) return rows[0].gramsPerDay;
  let lo = rows[0];
  let hi = rows[1];
  for (let i = 1; i < rows.length; i++) {
    lo = rows[i - 1];
    hi = rows[i];
    if (petWeightKg <= hi.petWeightKg) break;
  }
  const t = (petWeightKg - lo.petWeightKg) / (hi.petWeightKg - lo.petWeightKg);
  return Math.max(1, Math.round(lo.gramsPerDay + t * (hi.gramsPerDay - lo.gramsPerDay)));
}

export interface MonthlyCost {
  daysPerPackage: number;
  monthlyCost: number;
  packagesPerMonth: number;
}

export function monthlyCost(packagePrice: number, packageGrams: number, gramsPerDay: number): MonthlyCost | null {
  if (!(gramsPerDay > 0) || !(packageGrams > 0)) return null;
  const daysPerPackage = packageGrams / gramsPerDay;
  return {
    daysPerPackage,
    monthlyCost: Math.round((packagePrice / daysPerPackage) * 30 * 100) / 100,
    packagesPerMonth: 30 / daysPerPackage,
  };
}
