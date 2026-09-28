import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("foto no site", () => {
  it("sem foto no produto, usa a foto do anúncio confirmado vindo da API; nunca de oferta manual ou incerta", async () => {
    process.env.DATABASE_PATH = `${tmpdir()}/racao-foto-${process.pid}-${Date.now()}.db`;
    process.env.SEED_DEMO = "0";
    const { getDb } = await import("@/lib/db");
    const { saveProduct } = await import("@/lib/domain/products");
    const { createOffer, setMatchStatus } = await import("@/lib/domain/offers");
    const { getCatalog } = await import("@/lib/catalog/public");
    const db = getDb();
    const product = saveProduct(db, null, {
      species: "caes", brand: "Fórmula Natural", line: "Fresh Meat", indication: "Filhotes Mini e Pequeno", flavor: "Frango e mandioca",
      weightGrams: 2500, unitCount: null, neutered: false, lifeStage: "filhote", size: "mini_pequeno", foodType: "seca", needs: [],
      gtin: null, imageUrl: null, description: null, sources: [], notes: null, active: true,
    });
    const base = {
      productId: product.id, storeId: "mercado-livre", affiliateUrl: null, price: 103, previousPrice: null, previousPriceAt: null,
      availability: "disponivel" as const, freeShipping: true, listingTitle: null, listingWeightGrams: 2500, listingFlavor: "Frango e mandioca", notes: null,
    };
    const manual = createOffer(db, { ...base, dataSource: "manual", externalId: "MLB1000001", url: "https://www.mercadolivre.com.br/a/p/MLB1", imageUrl: "https://http2.mlstatic.com/manual.jpg" }, "t");
    const api = createOffer(db, { ...base, dataSource: "api", externalId: "MLB1000002", url: "https://www.mercadolivre.com.br/b/p/MLB2", imageUrl: "https://http2.mlstatic.com/api.jpg" }, "t");
    const item = () => getCatalog().then((all) => all.find((i) => i.id === String(product.id))!);
    expect((await item()).photoUrl).toBe("https://http2.mlstatic.com/api.jpg");
    setMatchStatus(db, api.id, "incerta", "t");
    expect(manual.id).toBeGreaterThan(0);
    // getCatalog é memorizado por requisição no servidor; nos testes chama de novo a função sem cache
    const { getCatalog: again } = await import("@/lib/catalog/public");
    expect((await again()).find((i) => i.id === String(product.id))!.photoUrl).toBeNull();
  });
});
