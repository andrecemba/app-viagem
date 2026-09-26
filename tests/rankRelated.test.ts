import { describe, expect, it } from "vitest";

import { rankRelated } from "@/lib/related/rankRelated";
import type { ComplementaryProduct, ComplementaryRule } from "@/types/catalog";

const rules: ComplementaryRule[] = [
  {
    id: "r1",
    species: "gatos",
    foodTypes: ["racao-seca"],
    lifeStages: [],
    suggest: [
      { category: "areia-sanitaria", relevance: 1 },
      { category: "arranhador", relevance: 0.5 },
    ],
  },
];

const item = (id: string, category: ComplementaryProduct["category"], offers: ComplementaryProduct["offers"], extra: Partial<ComplementaryProduct> = {}): ComplementaryProduct => ({
  id,
  slug: id,
  name: id,
  category,
  species: ["gatos"],
  lifeStages: [],
  offers,
  ...extra,
});

const offer = (id: string, storeId: string, price: number, commissionRate: number | null, inStock = true) => ({
  id,
  storeId,
  url: `https://example.com/${id}`,
  price,
  commissionRate,
  inStock,
});

const ctx = { species: "gatos" as const, foodType: "racao-seca" as const, lifeStages: ["adulto" as const] };

describe("rankRelated", () => {
  it("nunca sugere itens irrelevantes, mesmo com comissão alta", () => {
    const items = [
      item("coleira-cao", "coleira-guia", [offer("o1", "s1", 500, 0.5)], { species: ["caes"] }),
      item("areia", "areia-sanitaria", [offer("o2", "s1", 30, 0.05)]),
    ];
    expect(rankRelated(ctx, items, rules).map((r) => r.item.id)).toEqual(["areia"]);
  });

  it("filtra por fase de vida e estoque", () => {
    const items = [
      item("so-filhote", "areia-sanitaria", [offer("o1", "s1", 30, 0.1)], { lifeStages: ["filhote"] }),
      item("sem-estoque", "areia-sanitaria", [offer("o2", "s1", 30, 0.1, false)]),
      item("ok", "areia-sanitaria", [offer("o3", "s1", 30, 0.1)]),
    ];
    expect(rankRelated(ctx, items, rules).map((r) => r.item.id)).toEqual(["ok"]);
  });

  it("pontua por relevância × comissão esperada", () => {
    const items = [
      item("arranhador", "arranhador", [offer("o1", "s1", 200, 0.1)]), // 0.5 × 20 = 10
      item("areia", "areia-sanitaria", [offer("o2", "s1", 40, 0.1)]), // 1 × 4 = 4
    ];
    expect(rankRelated(ctx, items, rules).map((r) => r.item.id)).toEqual(["arranhador", "areia"]);
  });

  it("prefere a oferta da mesma loja e respeita sameStoreOnly", () => {
    const items = [
      item("a", "areia-sanitaria", [offer("barata", "s2", 20, 0.1), offer("mesma", "s1", 25, 0.1)]),
      item("b", "areia-sanitaria", [offer("outra", "s2", 20, 0.1)]),
    ];
    const r = rankRelated(ctx, items, rules, { storeId: "s1" });
    expect(r[0].offer.id).toBe("mesma");
    expect(r[0].sameStore).toBe(true);
    expect(rankRelated(ctx, items, rules, { storeId: "s1", sameStoreOnly: true }).map((x) => x.item.id)).toEqual(["a"]);
  });

  it("limita a 2 itens por categoria", () => {
    const items = ["a", "b", "c"].map((id) => item(id, "areia-sanitaria", [offer(id, "s1", 30, 0.1)]));
    expect(rankRelated(ctx, items, rules)).toHaveLength(2);
  });
});
