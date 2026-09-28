import { describe, expect, it, vi } from "vitest";

import { seedProducts } from "@/data/seed-products";
import { migrate, openDb } from "@/lib/db";
import { ensureSeed } from "@/lib/db/seed";
import { offerAlerts } from "@/lib/domain/alerts";
import { applySyncFailure, applySyncResult, createOffer, getOffer, listEvents, revertOverride, updateOffer, type NewOfferInput } from "@/lib/domain/offers";
import { getProduct, saveProduct, type ProductInput } from "@/lib/domain/products";
import { getSettings } from "@/lib/domain/settings";
import { getStore, saveStore } from "@/lib/domain/stores";
import { flavorMatches, identityKey, isValidGtin, storeForUrl, ValidationError, weightFromTitle } from "@/lib/domain/validation";
import { hashPassword, signSession, verifyPassword, verifySessionToken } from "@/lib/admin/session";
import { importOffersCsv, parseCsv } from "@/lib/integrations/csv";
import { listStores } from "@/lib/domain/stores";

vi.mock("server-only", () => ({}));

function freshDb(withDemo = false) {
  const prev = process.env.SEED_DEMO;
  process.env.SEED_DEMO = withDemo ? "1" : "0";
  const db = openDb(":memory:");
  migrate(db);
  ensureSeed(db);
  process.env.SEED_DEMO = prev;
  return db;
}

const base: ProductInput = {
  species: "caes",
  brand: "Marca Teste",
  line: "Linha",
  indication: "Cães Adultos",
  flavor: "Frango",
  weightGrams: 15000,
  unitCount: null,
  neutered: false,
  lifeStage: "adulto",
  size: "medio",
  foodType: "seca",
  needs: [],
  gtin: null,
  imageUrl: null,
  description: null,
  sources: [],
  notes: null,
  active: true,
};

const offerInput = (productId: number, patch: Partial<NewOfferInput> = {}): NewOfferInput => ({
  productId,
  storeId: "petz",
  dataSource: "manual",
  externalId: null,
  url: "https://www.petz.com.br/produto/racao-teste-123456",
  affiliateUrl: null,
  price: 199.9,
  previousPrice: null,
  previousPriceAt: null,
  availability: "disponivel",
  freeShipping: null,
  listingTitle: null,
  listingWeightGrams: 15000,
  listingFlavor: "Frango",
  imageUrl: null,
  notes: null,
  ...patch,
});

describe("cadastro inicial", () => {
  it("cria as 6 lojas e os produtos reais sem preço inventado", () => {
    const db = freshDb();
    expect(listStores(db).map((s) => s.id)).toEqual(["mercado-livre", "shopee", "amazon", "petz", "cobasi", "petlove"]);
    const count = (db.prepare("SELECT COUNT(*) AS n FROM products WHERE is_demo = 0").get() as { n: number }).n;
    expect(count).toBe(seedProducts.filter((p) => p.weightGrams != null).length);
    expect((db.prepare("SELECT COUNT(*) AS n FROM offers").get() as { n: number }).n).toBe(0);
  });

  it("exemplos ficam marcados e nunca redirecionam", () => {
    const db = freshDb(true);
    const offers = db.prepare("SELECT is_demo FROM offers").all() as { is_demo: number }[];
    expect(offers.length).toBeGreaterThan(50);
    expect(offers.every((o) => o.is_demo === 1)).toBe(true);
  });

  it("a Amazon só mostra preço vindo da API oficial", () => {
    const db = freshDb();
    expect(getStore(db, "amazon")!.priceDisplay).toBe("somente_api");
  });
});

describe("produto: a ração exata", () => {
  it("peso, sabor ou castrado diferentes são produtos diferentes; iguais são recusados", () => {
    const db = freshDb();
    saveProduct(db, null, base);
    expect(() => saveProduct(db, null, { ...base, brand: " marca teste " })).toThrow(ValidationError);
    expect(saveProduct(db, null, { ...base, weightGrams: 3000 }).id).toBeGreaterThan(0);
    expect(saveProduct(db, null, { ...base, flavor: "Carne" }).id).toBeGreaterThan(0);
    expect(saveProduct(db, null, { ...base, neutered: true }).id).toBeGreaterThan(0);
    expect(identityKey(base)).not.toBe(identityKey({ ...base, neutered: true }));
  });

  it("valida GTIN pelo dígito verificador e gera URL legível", () => {
    const db = freshDb();
    expect(isValidGtin("7896029075722")).toBe(true);
    expect(isValidGtin("7896029075723")).toBe(false);
    expect(() => saveProduct(db, null, { ...base, gtin: "7896029075723" })).toThrow(/GTIN/);
    const p = saveProduct(db, null, base);
    expect(p.slug).toBe("marca-teste-linha-caes-adultos-frango-15-kg");
  });
});

describe("oferta", () => {
  it("recusa URL e link de afiliado fora dos domínios da loja", () => {
    const db = freshDb();
    const p = saveProduct(db, null, base);
    expect(() => createOffer(db, offerInput(p.id, { url: "https://www.cobasi.com.br/x" }), "t")).toThrow(/não é de Petz/);
    expect(() => createOffer(db, offerInput(p.id, { url: "http://www.petz.com.br/x" }), "t")).toThrow(/https/);
    expect(() => createOffer(db, offerInput(p.id, { affiliateUrl: "https://encurtador.suspeito/x" }), "t")).toThrow(/afiliado/);
    expect(createOffer(db, offerInput(p.id, { storeId: "amazon", url: "https://www.amazon.com.br/dp/B07Y2BYSGD", affiliateUrl: "https://amzn.to/abc" }), "t").id).toBeGreaterThan(0);
  });

  it("peso ou sabor diferente do produto marca a correspondência como incerta", () => {
    const db = freshDb();
    const p = saveProduct(db, null, base);
    expect(createOffer(db, offerInput(p.id), "t").matchStatus).toBe("confirmada");
    const o = createOffer(db, offerInput(p.id, { storeId: "cobasi", url: "https://www.cobasi.com.br/x-1", listingWeightGrams: null, listingTitle: "Ração Teste Frango 3kg" }), "t");
    expect(o.listingWeightGrams).toBe(3000);
    expect(o.matchStatus).toBe("incerta");
    const s = createOffer(db, offerInput(p.id, { storeId: "petlove", url: "https://www.petlove.com.br/x", listingFlavor: "Carne" }), "t");
    expect(s.matchStatus).toBe("incerta");
    expect(flavorMatches("Frango e Arroz", "sabor frango & arroz")).toBe(true);
  });

  it("edição manual guarda o preço anterior com a data", () => {
    const db = freshDb();
    const p = saveProduct(db, null, base);
    const o = createOffer(db, offerInput(p.id), "t");
    const next = updateOffer(db, o.id, { price: 179.9 }, "admin:a");
    expect(next.price).toBe(179.9);
    expect(next.previousPrice).toBe(199.9);
    expect(next.previousPriceAt).toBe(o.priceObtainedAt);
    expect(listEvents(db, o.id)[0].kind).toBe("edicao");
  });
});

describe("correção manual de oferta importada", () => {
  const setup = () => {
    const db = freshDb();
    const p = saveProduct(db, null, base);
    const o = createOffer(
      db,
      offerInput(p.id, { storeId: "mercado-livre", dataSource: "api", externalId: "MLB1234567", url: "https://produto.mercadolivre.com.br/MLB-1234567-racao" }),
      "api",
    );
    return { db, o };
  };
  const sync = (price: number) => ({
    price,
    availability: "disponivel" as const,
    freeShipping: true,
    listingTitle: "Ração Teste Frango 15 kg",
    listingWeightGrams: null,
    imageUrl: null,
    obtainedAt: new Date().toISOString(),
    source: "api:mercado-livre",
  });

  it("a correção vence a sincronização, com origem e data, até voltar ao automático", () => {
    const { db, o } = setup();
    updateOffer(db, o.id, { price: 150 }, "admin:ana", "conferido no site");
    let cur = getOffer(db, o.id)!;
    expect(cur.price).toBe(150);
    expect(cur.overrides.price).toMatchObject({ createdBy: "admin:ana", note: "conferido no site" });
    expect(cur.overrides.price!.createdAt).toBeTruthy();

    applySyncResult(db, o.id, sync(210));
    cur = getOffer(db, o.id)!;
    expect(cur.price).toBe(150); // não foi apagada pela sincronização
    expect(cur.auto.price).toBe(210); // o valor automático novo fica visível

    revertOverride(db, o.id, "price", "admin:ana");
    cur = getOffer(db, o.id)!;
    expect(cur.price).toBe(210);
    expect(cur.overrides.price).toBeUndefined();
    expect(listEvents(db, o.id).map((e) => e.kind)).toEqual(expect.arrayContaining(["correcao", "sincronizacao", "volta_automatico"]));
  });

  it("falha na consulta mantém o último preço válido e gera alerta", () => {
    const { db, o } = setup();
    applySyncFailure(db, o.id, "Sem permissão na API (403)", "api:mercado-livre");
    applySyncFailure(db, o.id, "Sem permissão na API (403)", "api:mercado-livre");
    const cur = getOffer(db, o.id)!;
    expect(cur.price).toBe(199.9);
    expect(cur.consecutiveFailures).toBe(2);
    const product = getProduct(db, cur.productId)!;
    const kinds = offerAlerts(cur, product, getStore(db, "mercado-livre")!, getSettings(db)).map((a) => a.kind);
    expect(kinds).toContain("erro_importacao");
    expect(kinds).toContain("sem_afiliado");
  });

  it("peso novo diferente no anúncio manda para revisão", () => {
    const { db, o } = setup();
    applySyncResult(db, o.id, { ...sync(199.9), listingTitle: "Ração Teste Frango 10,1 kg" });
    expect(getOffer(db, o.id)!.matchStatus).toBe("incerta");
  });
});

describe("alertas", () => {
  it("preço antigo passa do prazo configurado (48 h)", () => {
    const db = freshDb();
    const p = saveProduct(db, null, base);
    const o = createOffer(db, offerInput(p.id, { obtainedAt: new Date(Date.now() - 50 * 3600_000).toISOString() }), "t");
    const kinds = offerAlerts(getOffer(db, o.id)!, p, getStore(db, "petz")!, getSettings(db)).map((a) => a.kind);
    expect(kinds).toContain("preco_antigo");
  });
});

describe("lojas", () => {
  it("nova loja entra por domínio e modo, sem credenciais no cadastro", () => {
    const db = freshDb();
    const s = saveStore(
      db,
      { name: "Pet Center Exemplo", domains: ["https://www.petcenterexemplo.com.br/"], affiliateDomains: [], mode: "feed", adapter: "csv", priceDisplay: "sempre", color: "#123456", logoUrl: null, active: true },
      true,
    );
    expect(s.id).toBe("pet-center-exemplo");
    expect(s.domains).toEqual(["petcenterexemplo.com.br"]);
    expect(storeForUrl(listStores(db), "https://loja.petcenterexemplo.com.br/p/1")?.id).toBe("pet-center-exemplo");
    expect(() => saveStore(db, { ...s, name: "Outra", domains: [], id: "x" }, true)).toThrow(/domínio/);
  });

  it("importa CSV só para ofertas já cadastradas e registra erros de linha", () => {
    const db = freshDb();
    saveStore(db, { ...getStore(db, "cobasi")!, mode: "feed", adapter: "csv" }, false);
    const p = saveProduct(db, null, base);
    const o = createOffer(db, offerInput(p.id, { storeId: "cobasi", dataSource: "feed", externalId: "C-1", url: "https://www.cobasi.com.br/racao-1/p" }), "t");
    const r = importOffersCsv(db, "cobasi", "id_anuncio;preco;disponivel;titulo\nC-1;189,90;sim;Ração Teste Frango 15kg\nC-2;99,00;sim;Outra\nC-1;abc;sim;x");
    expect(r.updated).toBe(1);
    expect(r.unknownIds).toEqual(["C-2"]);
    expect(r.errors).toHaveLength(1);
    // A linha inválida registra falha, mas não apaga o preço válido lido antes.
    expect(getOffer(db, o.id)!.price).toBe(189.9);
    expect(getOffer(db, o.id)!.lastSyncStatus).toBe("erro");
    expect(parseCsv('a,b\n"1,5",x')[0]).toEqual({ a: "1,5", b: "x" });
  });
});

describe("leitura de peso em títulos", () => {
  it("entende kg e g e não arrisca quando há mais de um peso", () => {
    expect(weightFromTitle("Ração Golden 15kg")).toBe(15000);
    expect(weightFromTitle("Ração 10,1 Kg")).toBe(10100);
    expect(weightFromTitle("Sachê 85 g")).toBe(85);
    expect(weightFromTitle("Kit 12 x 85 g + brinde 1 kg")).toBeNull();
  });
});

describe("sessão", () => {
  it("assina, valida, expira e rejeita adulteração", () => {
    const now = Date.now();
    const secret = "x".repeat(40);
    const token = signSession({ sub: "a@b.com", exp: Math.floor(now / 1000) + 60 }, secret);
    expect(verifySessionToken(token, secret, now)?.sub).toBe("a@b.com");
    expect(verifySessionToken(token, secret, now + 120_000)).toBeNull();
    expect(verifySessionToken(token + "x", secret, now)).toBeNull();
    expect(verifySessionToken(token, "y".repeat(40), now)).toBeNull();
  });

  it("hash de senha", () => {
    const h = hashPassword("senha-forte-123");
    expect(verifyPassword("senha-forte-123", h)).toBe(true);
    expect(verifyPassword("errada", h)).toBe(false);
  });
});
