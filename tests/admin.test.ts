import { describe, expect, it, vi } from "vitest";

import { seedProducts } from "@/data/admin/seed-products";
import { EMPTY_DRAFT } from "@/components/admin/product-form";
import { AdminError, missingForPublish, pendingFields, saveOffer, saveProduct, saveSettings, setProductsStatus } from "@/lib/admin/mutations";
import { buildRows, computeFacets, matchesFilters, readProductFilters } from "@/lib/admin/product-list";
import { createInitialDb } from "@/lib/admin/seed";
import { hashPassword, signSession, verifyPassword, verifySessionToken } from "@/lib/admin/session";
import { buildReport } from "@/lib/analytics/report";
import { isAutomated, sanitizeQuery } from "@/lib/analytics/sanitize";
import type { AnalyticsEvent } from "@/lib/analytics/types";
import { adminProductToItem, averageBestPrice } from "@/lib/data/admin-source";

vi.mock("server-only", () => ({}));

const NOW = new Date("2026-09-27T12:00:00-03:00");
const iso = (daysAgo = 0) => new Date(NOW.getTime() - daysAgo * 86400_000).toISOString();

describe("catálogo inicial", () => {
  it("tem 20 produtos reais, 10 de cada espécie, cada um com fonte", () => {
    expect(seedProducts).toHaveLength(20);
    expect(seedProducts.filter((p) => p.species === "caes")).toHaveLength(10);
    expect(seedProducts.filter((p) => p.species === "gatos")).toHaveLength(10);
    for (const p of seedProducts) expect(p.sources.length).toBeGreaterThan(0);
    expect(new Set(seedProducts.map((p) => p.key)).size).toBe(20);
  });

  it("nada nasce conferido nem publicado; dado ausente ou divergente fica vazio", () => {
    const db = createInitialDb(iso());
    expect(db.products.every((p) => !p.verified && p.status === "rascunho" && p.offers.length === 0)).toBe(true);
    expect(db.products.every((p) => p.gtin === null && p.imageUrl === null && p.description === null)).toBe(true);
    const hills = db.products.find((p) => p.id.includes("hills"))!;
    expect(hills.weightGrams).toBeNull();
    expect(pendingFields(hills)).toContain("Peso");
    const premierCats = db.products.find((p) => p.id === "prd-premier-gatos-castrados-salmao-7-5")!;
    expect(premierCats.formula).toBeNull();
  });

  it("gatos castrados viram idade adulto + indicação Castrados só quando a fonte diz adulto", () => {
    const db = createInitialDb(iso());
    const castrados = db.products.filter((p) => p.needs.includes("castrados"));
    expect(castrados.length).toBe(6);
    expect(castrados.every((p) => p.lifeStage === "adulto")).toBe(true);
  });
});

describe("cadastro de produto", () => {
  const base = { ...EMPTY_DRAFT, brand: "Marca Teste", formula: "Adulto", species: "caes" as const };

  it("cria como rascunho; publicar exige os obrigatórios", () => {
    let db = createInitialDb(iso());
    const r = saveProduct(db, null, base, "admin:a", iso());
    db = r.db;
    expect(db.products[0].status).toBe("rascunho");
    expect(missingForPublish(db.products[0])).toEqual(["idade", "tipo", "peso"]);
    const blocked = setProductsStatus(db, [r.id], "publicado", "admin:a", iso());
    expect(blocked.blocked[0].missing).toContain("peso");
    const done = saveProduct(db, r.id, { ...base, lifeStage: "adulto", foodType: "seca", weightGrams: 15000 }, "admin:a", iso());
    const pub = setProductsStatus(done.db, [r.id], "publicado", "admin:a", iso());
    expect(pub.blocked).toHaveLength(0);
    expect(pub.db.products.find((p) => p.id === r.id)!.status).toBe("publicado");
  });

  it("edição persiste e publicado não pode perder obrigatório", () => {
    const db0 = createInitialDb(iso());
    const created = saveProduct(db0, null, { ...base, lifeStage: "adulto", foodType: "seca", weightGrams: 3000 }, "admin:a", iso());
    const pub = setProductsStatus(created.db, [created.id], "publicado", "admin:a", iso()).db;
    const edited = saveProduct(pub, created.id, { ...base, lifeStage: "adulto", foodType: "seca", weightGrams: 3000, flavor: "Frango", description: "Texto" }, "admin:b", iso());
    const p = edited.db.products.find((x) => x.id === created.id)!;
    expect(p.flavor).toBe("Frango");
    expect(p.updatedBy).toBe("admin:b");
    expect(() => saveProduct(pub, created.id, { ...base, lifeStage: "adulto", foodType: "seca", weightGrams: null }, "admin:a", iso())).toThrow(AdminError);
  });

  it("valida código de barras, foto e peso", () => {
    const db = createInitialDb(iso());
    expect(() => saveProduct(db, null, { ...base, gtin: "123" }, "a", iso())).toThrow(/8, 12, 13 ou 14/);
    expect(() => saveProduct(db, null, { ...base, imageUrl: "http://x.com/a.png" }, "a", iso())).toThrow(/https/);
    expect(() => saveProduct(db, null, { ...base, weightGrams: 0 }, "a", iso())).toThrow(/Peso/);
  });
});

describe("preços nas lojas", () => {
  const setup = () => {
    const db = createInitialDb(iso(40));
    return { db, id: db.products[0].id };
  };

  it("guarda histórico quando o preço muda e recusa link de outra loja", () => {
    const { db, id } = setup();
    let next = saveOffer(db, id, null, { store: "amazon", price: 100, url: "https://www.amazon.com.br/dp/X", sellerName: null, available: true }, iso(20));
    const offerId = next.products[0].offers[0].id;
    next = saveOffer(next, id, offerId, { store: "amazon", price: 90, url: "https://www.amazon.com.br/dp/X", sellerName: null, available: true }, iso(1));
    expect(next.products[0].offers[0].history.map((h) => h.price)).toEqual([100, 90]);
    expect(() => saveOffer(db, id, null, { store: "petz", price: 10, url: "https://www.cobasi.com.br/x", sellerName: null, available: true }, iso())).toThrow(/não é de Petz/);
    expect(() => saveOffer(next, id, null, { store: "amazon", price: 10, url: null, sellerName: null, available: true }, iso())).toThrow(/já tem um preço/);
  });

  it("média de 30 dias usa o preço vigente de cada dia", () => {
    const offer = { id: "o", store: "amazon", price: 90, url: null, sellerName: null, available: true, updatedAt: iso(), history: [{ at: iso(40), price: 100 }, { at: iso(3), price: 90 }] };
    const avg = averageBestPrice([offer], NOW)!;
    expect(avg).toBeGreaterThan(90);
    expect(avg).toBeLessThan(100);
    expect(averageBestPrice([{ ...offer, history: [{ at: iso(2), price: 90 }] }], NOW)).toBeNull();
  });

  it("só produto publicado e completo vai para o site; link nunca vai junto", () => {
    const { db, id } = setup();
    const withOffer = saveOffer(db, id, null, { store: "amazon", price: 100, url: "https://www.amazon.com.br/dp/X", sellerName: null, available: true }, iso());
    const p = withOffer.products.find((x) => x.id === id)!;
    expect(adminProductToItem(p)).toBeNull();
    const item = adminProductToItem({ ...p, status: "publicado" })!;
    expect(item.bestPrice).toBe(100);
    expect(JSON.stringify(item)).not.toContain("amazon.com.br/dp/X");
  });
});

describe("filtros da tela de produtos", () => {
  const rows = buildRows(createInitialDb(iso()).products);

  it("combina dimensões e conta opções mantendo os outros filtros", () => {
    const { filters } = readProductFilters({ especie: "gatos", marca: ["Golden", "Royal Canin"] });
    const list = rows.filter((r) => matchesFilters(r, filters));
    expect(list.every((r) => r.species === "gatos" && ["Golden", "Royal Canin"].includes(r.brand!))).toBe(true);
    expect(list).toHaveLength(4);
    const facets = computeFacets(rows, filters);
    expect(facets.find((f) => f.dim === "especie")!.options.find((o) => o.value === "caes")!.count).toBeGreaterThan(0);
  });

  it("filtra por pendência", () => {
    const { filters } = readProductFilters({ dados: "completo" });
    expect(rows.filter((r) => matchesFilters(r, filters))).toHaveLength(0);
  });
});

describe("relatórios", () => {
  const snap = { productId: "p1", productName: "Golden · Frango", brand: "Golden", species: "caes", kind: "seca", sizes: ["medio"], weightGrams: 15000 };
  const events: AnalyticsEvent[] = [
    { at: iso(1), type: "produto", ...snap },
    { at: iso(1), type: "produto", ...snap },
    { at: iso(1), type: "clique", ...snap, store: "amazon", price: 200 },
    { at: iso(2), type: "clique", ...snap, store: "petz", price: 100 },
    { at: iso(2), type: "busca", q: "golden", results: 4 },
    { at: iso(2), type: "busca", q: "marca x", results: 0 },
    { at: iso(2), type: "filtro", dim: "peso", value: "10-15kg" },
    { at: iso(60), type: "clique", ...snap, store: "amazon", price: 999 },
  ];

  it("conta cliques, lojas, rações, buscas sem resultado e ignora fora do período", () => {
    const r = buildReport(events, { from: new Date(iso(7)), to: NOW, conversionRate: null, commission: {} });
    expect(r.totals).toMatchObject({ clicks: 2, views: 2, searches: 2, clickedValue: 300 });
    expect(r.stores.map((s) => s.store)).toEqual(["amazon", "petz"]);
    expect(r.products[0]).toMatchObject({ label: "Golden · Frango", views: 2, clicks: 2 });
    expect(r.zeroResultTerms).toEqual([{ q: "marca x", count: 1 }]);
    expect(r.weights.map((w) => w.label)).toEqual(["15 kg", "10 a 15 kg"]);
    expect(r.clicksByDay.length).toBeGreaterThanOrEqual(7);
    expect(r.estimate.total).toBeNull();
  });

  it("estima comissão só com taxas informadas", () => {
    const r = buildReport(events, { from: new Date(iso(7)), to: NOW, conversionRate: 0.1, commission: { amazon: 0.05 } });
    expect(r.stores.find((s) => s.store === "amazon")!.estimate).toBe(1);
    expect(r.stores.find((s) => s.store === "petz")!.estimate).toBeNull();
    expect(r.estimate.total).toBe(1);
    expect(r.estimate.storesWithoutRate).toEqual(["Petz"]);
  });

  it("taxas fora de 0–100% são recusadas", () => {
    expect(() => saveSettings(createInitialDb(iso()), { conversionRate: 2, commission: {} })).toThrow(AdminError);
  });

  it("não grava termos com cara de dado pessoal e ignora robôs", () => {
    expect(sanitizeQuery("  Golden   15KG ")).toBe("golden 15kg");
    expect(sanitizeQuery("fulano@email.com")).toBeNull();
    expect(sanitizeQuery("41 99999-8888")).toBeNull();
    expect(sanitizeQuery("123.456.789-00")).toBeNull();
    expect(isAutomated(new Headers({ "user-agent": "Googlebot/2.1" }))).toBe(true);
    expect(isAutomated(new Headers({ "user-agent": "Mozilla/5.0", "sec-purpose": "prefetch" }))).toBe(true);
    expect(isAutomated(new Headers({ "user-agent": "Mozilla/5.0 (iPhone)" }))).toBe(false);
  });
});

describe("sessão", () => {
  it("assina, valida, expira e rejeita adulteração", () => {
    const secret = "x".repeat(40);
    const token = signSession({ sub: "a@b.com", exp: Math.floor(NOW.getTime() / 1000) + 60 }, secret);
    expect(verifySessionToken(token, secret, NOW.getTime())?.sub).toBe("a@b.com");
    expect(verifySessionToken(token, secret, NOW.getTime() + 120_000)).toBeNull();
    expect(verifySessionToken(token + "x", secret, NOW.getTime())).toBeNull();
    expect(verifySessionToken(token, "y".repeat(40), NOW.getTime())).toBeNull();
  });

  it("hash de senha", () => {
    const h = hashPassword("senha-forte-123");
    expect(verifyPassword("senha-forte-123", h)).toBe(true);
    expect(verifyPassword("errada", h)).toBe(false);
  });
});
