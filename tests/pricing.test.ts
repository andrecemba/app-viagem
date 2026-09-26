import { describe, expect, it } from "vitest";

import { computeOfferBadges } from "@/lib/pricing/badges";
import { rankOffersHonestly } from "@/lib/pricing/rankOffers";
import { computeUnitPrice } from "@/lib/pricing/unitPrice";

describe("computeUnitPrice", () => {
  it("ração seca → R$/kg", () => {
    expect(computeUnitPrice(299.9, 15000, "dry")).toMatchObject({ value: 19.99, metric: "kg", label: "/kg" });
    expect(computeUnitPrice(89.9, 10100, "dry").value).toBe(8.9);
  });

  it("úmida → R$/100 g e R$/unidade", () => {
    const u = computeUnitPrice(59.9, 1700, "wet", 20);
    expect(u.metric).toBe("100g");
    expect(u.value).toBe(3.52);
    expect(u.perUnit).toBe(3);
  });

  it("petiscos → R$/100 g", () => {
    expect(computeUnitPrice(19.9, 180, "snack").value).toBe(11.06);
  });

  it("rejeita peso inválido", () => {
    expect(() => computeUnitPrice(10, 0, "dry")).toThrow();
  });
});

describe("rankOffersHonestly", () => {
  const o = (id: string, unitPrice: number, hasCommission: boolean) => ({ id, unitPrice, hasCommission });

  it("mais barato primeiro, com ou sem comissão", () => {
    const r = rankOffersHonestly([o("comissao", 20, true), o("barata", 18, false), o("media", 19, true)]);
    expect(r.map((x) => x.id)).toEqual(["barata", "media", "comissao"]);
  });

  it("em empate de até 1%, prioriza a oferta com comissão", () => {
    const r = rankOffersHonestly([o("sem", 20, false), o("com", 20.19, true)]);
    expect(r.map((x) => x.id)).toEqual(["com", "sem"]);
  });

  it("não troca ofertas com diferença acima de 1%", () => {
    const r = rankOffersHonestly([o("sem", 20, false), o("com", 20.21, true)]);
    expect(r.map((x) => x.id)).toEqual(["sem", "com"]);
  });

  it("o grupo de empate é ancorado na oferta mais barata (sem encadear)", () => {
    // 20 → 20.15 → 20.30: a terceira está a 1,5% da mais barata e não sobe.
    const r = rankOffersHonestly([o("a", 20, false), o("b", 20.15, false), o("c", 20.3, true)]);
    expect(r.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("não modifica o array original", () => {
    const input = [o("b", 2, false), o("a", 1, false)];
    rankOffersHonestly(input);
    expect(input[0].id).toBe("b");
  });
});

describe("computeOfferBadges", () => {
  const history = (prices: number[]) => prices.map((price, i) => ({ date: `2026-09-${String(i + 1).padStart(2, "0")}`, price }));

  it("sinaliza queda desde a última verificação e menor preço em 30 dias", () => {
    const b = computeOfferBadges(90, history([100, 102, 99, 101, 100, 98, 100, 100, 90]), true);
    expect(b.map((x) => x.kind)).toEqual(["drop", "lowest30", "freeShipping"]);
    expect(b[0].label).toBe("Caiu 10%");
  });

  it("sem selos quando o preço subiu", () => {
    expect(computeOfferBadges(110, history([100, 100, 100, 100, 100, 100, 100, 100, 110]), false)).toEqual([]);
  });
});

import { gramsPerDayFor, monthlyCost } from "@/lib/pricing/feeding";

describe("calculadora de consumo", () => {
  const table = [
    { petWeightKg: 5, gramsPerDay: 100 },
    { petWeightKg: 10, gramsPerDay: 160 },
    { petWeightKg: 20, gramsPerDay: 260 },
  ];

  it("interpola entre linhas da tabela", () => {
    expect(gramsPerDayFor(table, 10)).toBe(160);
    expect(gramsPerDayFor(table, 15)).toBe(210);
    expect(gramsPerDayFor(table, 7.5)).toBe(130);
  });

  it("extrapola pelas pontas e rejeita peso inválido", () => {
    expect(gramsPerDayFor(table, 25)).toBe(310);
    expect(gramsPerDayFor(table, 0)).toBeNull();
  });

  it("calcula dias por pacote e custo mensal", () => {
    const r = monthlyCost(300, 15000, 250)!;
    expect(r.daysPerPackage).toBe(60);
    expect(r.monthlyCost).toBe(150);
    expect(r.packagesPerMonth).toBe(0.5);
  });
});
