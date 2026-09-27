import { describe, expect, it } from "vitest";

import { seedProducts } from "@/data/admin/seed-products";
import { evaluateAlerts, findIssues, weightFromTitle } from "@/lib/admin/alerts";
import { applyFailure, applyReading, applyStaleRule, runChecks } from "@/lib/admin/checks";
import { loadDemoData, removeDemoData } from "@/lib/admin/demo";
import { acceptAutoValue, applyAutoValue, applyManualValue, emptyField, fieldFrom } from "@/lib/admin/fields";
import {
  createOffer,
  createProduct,
  editOfferField,
  editProductField,
  ignoreAlert,
  importProductValues,
  setProductsStatus,
} from "@/lib/admin/mutations";
import { buildRows, computeFacets, matchesFilters, productFiltersHref, readProductFilters } from "@/lib/admin/product-list";
import { createInitialDb } from "@/lib/admin/seed";
import { hashPassword, signSession, verifyPassword, verifySessionToken } from "@/lib/admin/session";

const NOW = new Date("2026-09-27T12:00:00-03:00");
const later = (h: number) => new Date(NOW.getTime() + h * 3600_000);

describe("catálogo inicial", () => {
  it("tem 20 produtos reais, 10 de cada espécie, cada um com fonte", () => {
    expect(seedProducts).toHaveLength(20);
    expect(seedProducts.filter((p) => p.species === "caes")).toHaveLength(10);
    expect(seedProducts.filter((p) => p.species === "gatos")).toHaveLength(10);
    for (const p of seedProducts) expect(p.sources.length).toBeGreaterThan(0);
    expect(new Set(seedProducts.map((p) => p.key)).size).toBe(20);
  });

  it("nenhum campo nasce como verificado, e dado ausente fica vazio e pendente", () => {
    const db = createInitialDb(NOW.toISOString());
    for (const p of db.products) for (const f of Object.values(p.fields)) expect(f.verification).not.toBe("verificado");
    const hills = db.products.find((p) => p.id === "prd-hills-sd-adulto-pequenos-mini-frango")!;
    expect(hills.fields.weightGrams.value).toBeNull();
    expect(hills.fields.weightGrams.verification).toBe("pendente");
    const rc = db.products.find((p) => p.id === "prd-rc-mini-adult-7-5")!;
    expect(rc.fields.flavor.value).toBeNull();
    expect(rc.fields.gtin.value).toBeNull();
    expect(rc.fields.imageUrl.value).toBeNull();
  });

  it("não aponta duplicatas entre sabores ou pesos diferentes", () => {
    const db = createInitialDb(NOW.toISOString());
    expect(findIssues(db, NOW).filter((f) => f.type === "possivel_duplicata")).toHaveLength(0);
  });
});

describe("campo com valor automático e correção manual", () => {
  const at = NOW.toISOString();

  it("importação aplica valor quando não há correção", () => {
    const r = applyAutoValue(fieldFrom(100, "x", at, "fonte_localizada"), 110, "integração", at);
    expect(r.outcome).toBe("applied");
    expect(r.field.value).toBe(110);
  });

  it("campo travado não é sobrescrito; o novo valor fica pendente", () => {
    const manual = applyManualValue(fieldFrom(100, "x", at, "fonte_localizada"), 95, "admin", at, { lock: true });
    const r = applyAutoValue(manual, 120, "integração", at);
    expect(r.outcome).toBe("held");
    expect(r.field.value).toBe(95);
    expect(r.field.pendingAuto?.value).toBe(120);
    const accepted = acceptAutoValue(r.field);
    expect(accepted.value).toBe(120);
    expect(accepted.manual).toBeNull();
    expect(accepted.locked).toBe(false);
  });

  it("correção sem trava é substituída, mas o resultado informa (não é silencioso)", () => {
    const manual = applyManualValue(fieldFrom(100, "x", at, "fonte_localizada"), 95, "admin", at, { lock: false });
    const r = applyAutoValue(manual, 120, "integração", at);
    expect(r.outcome).toBe("replaced_manual");
  });

  it("campos sensíveis nunca trocam sem revisão", () => {
    const r = applyAutoValue(fieldFrom("Frango", "x", at, "fonte_localizada"), "Carne", "integração", at, { sensitive: true });
    expect(r.outcome).toBe("held");
    expect(r.field.value).toBe("Frango");
  });

  it("leitura vazia ou zero não apaga o valor", () => {
    const f = fieldFrom(100, "x", at, "fonte_localizada");
    expect(applyAutoValue(f, 0, "integração", at).field.value).toBe(100);
    expect(applyAutoValue(f, null, "integração", at).field.value).toBe(100);
    expect(applyAutoValue(emptyField<string>(), "  ", "integração", at).outcome).toBe("ignored_empty");
  });
});

describe("produtos", () => {
  it("cadastro manual cria rascunho e publicação exige campos obrigatórios", () => {
    let db = createInitialDb(NOW.toISOString());
    const created = createProduct(db, { brand: "Marca Teste", formula: "Adulto", species: "caes" }, null, "admin:a", NOW);
    db = created.db;
    const p = db.products.find((x) => x.id === created.id)!;
    expect(p.status).toBe("rascunho");
    const r = setProductsStatus(db, [created.id], "publicado", "admin:a", NOW);
    expect(r.blocked[0].missing).toEqual(expect.arrayContaining(["Peso (g)", "Tipo de ração", "Fase da vida"]));
  });

  it("correção manual travada sobrevive à importação e fica no histórico", () => {
    let db = createInitialDb(NOW.toISOString());
    const id = "prd-golden-gatos-castrados-frango-10-1";
    db = editProductField(db, id, "description", "Descrição conferida", { lock: true, reviewAt: null }, "admin:a", NOW);
    db = importProductValues(db, id, { description: "Texto da loja", flavor: "Carne" }, "integração:teste", "automação", later(1));
    const p = db.products.find((x) => x.id === id)!;
    expect(p.fields.description.value).toBe("Descrição conferida");
    expect(p.fields.description.pendingAuto?.value).toBe("Texto da loja");
    expect(p.fields.flavor.value).toBe("Frango");
    expect(p.fields.flavor.pendingAuto?.value).toBe("Carne");
    expect(db.history.filter((h) => h.productId === id && h.result === "pendente")).toHaveLength(2);
    const alerts = evaluateAlerts(db, later(1)).alerts.filter((a) => a.type === "valor_automatico_divergente" && a.productId === id);
    expect(alerts).toHaveLength(2);
  });
});

describe("verificações", () => {
  it("falha não troca o preço por zero e conta falhas seguidas", () => {
    let db = createInitialDb(NOW.toISOString());
    const c = createOffer(db, { productId: db.products[0].id, storeId: "amazon", externalId: "B0TESTE", price: 199.9, availability: "disponivel", url: "https://www.amazon.com.br/dp/B0TESTE", affiliateUrl: null, sellerName: "Amazon", listingTitle: null, commissionEligibility: "nao_confirmada" }, "admin:a", NOW);
    db = c.db;
    let offer = db.offers.find((o) => o.id === c.id)!;
    for (let i = 0; i < 3; i++) offer = applyFailure(offer, "erro", later(i).toISOString()).offer;
    expect(offer.fields.price.value).toBe(199.9);
    expect(offer.consecutiveFailures).toBe(3);
    db = { ...db, offers: db.offers.map((o) => (o.id === offer.id ? offer : o)) };
    expect(findIssues(db, later(3)).some((f) => f.type === "falha_repetida" && f.offerId === c.id)).toBe(true);
  });

  it("preço travado pelo admin não muda na leitura automática", () => {
    let db = createInitialDb(NOW.toISOString());
    const c = createOffer(db, { productId: db.products[0].id, storeId: "petz", externalId: "P1", price: 100, availability: "disponivel", url: "https://www.petz.com.br/x", affiliateUrl: null, sellerName: "Petz", listingTitle: null, commissionEligibility: "sem_programa" }, "admin:a", NOW);
    db = editOfferField(c.db, c.id, "price", 89.9, { lock: true, reviewAt: null }, "admin:a", NOW);
    const offer = db.offers.find((o) => o.id === c.id)!;
    const { offer: after, events } = applyReading(offer, { price: 120 }, "integração:petz", later(1).toISOString());
    expect(after.fields.price.value).toBe(89.9);
    expect(after.fields.price.pendingAuto?.value).toBe(120);
    expect(events[0].result).toBe("pendente");
  });

  it("sem conector real a consulta não acontece e a execução diz isso", async () => {
    let db = createInitialDb(NOW.toISOString());
    db = createOffer(db, { productId: db.products[0].id, storeId: "amazon", externalId: "B0X", price: 100, availability: "disponivel", url: "https://www.amazon.com.br/dp/B0X", affiliateUrl: null, sellerName: "Amazon", listingTitle: null, commissionEligibility: "nao_confirmada" }, "admin:a", NOW).db;
    const { db: after, run } = await runChecks(db, { trigger: "manual", now: later(49) });
    expect(run.stores[0].consulted).toBe(0);
    expect(run.stores[0].skipped).toBe(1);
    expect(run.stores[0].message).toMatch(/pendente de configuração/);
    expect(after.offers[0].fields.price.value).toBe(100);
  });

  it("regra da loja oculta oferta antiga", () => {
    let db = createInitialDb(NOW.toISOString());
    db = createOffer(db, { productId: db.products[0].id, storeId: "amazon", externalId: "B0Y", price: 100, availability: "disponivel", url: "https://www.amazon.com.br/dp/B0Y", affiliateUrl: null, sellerName: "Amazon", listingTitle: null, commissionEligibility: "nao_confirmada" }, "admin:a", NOW).db;
    expect(applyStaleRule(db, later(100)).db.offers[0].hidden).toBeNull();
    expect(applyStaleRule(db, later(200)).db.offers[0].hidden?.reason).toMatch(/168 h/);
  });
});

describe("alertas", () => {
  it("não duplica a cada avaliação e resolve quando a condição some", () => {
    let db = createInitialDb(NOW.toISOString());
    db = evaluateAlerts(db, NOW);
    const count = db.alerts.length;
    db = evaluateAlerts(db, later(1));
    db = evaluateAlerts(db, later(2));
    expect(db.alerts.length).toBe(count);
    const img = db.alerts.find((a) => a.type === "imagem")!;
    expect(img.occurrences).toBe(3);
    expect(img.firstSeenAt).toBe(NOW.toISOString());
    db = editProductField(db, img.productId!, "imageUrl", "https://exemplo.com/foto.jpg", { lock: true, reviewAt: null }, "admin:a", later(3));
    db = { ...db, products: db.products.map((p) => (p.id === img.productId ? { ...p, imageStatus: "ok" } : p)) };
    db = evaluateAlerts(db, later(3));
    expect(db.alerts.find((a) => a.id === img.id)!.status).toBe("resolvido");
  });

  it("ignorar exige justificativa e continua ignorado", () => {
    let db = evaluateAlerts(createInitialDb(NOW.toISOString()), NOW);
    const a = db.alerts[0];
    expect(() => ignoreAlert(db, a.id, "", "admin:a", NOW)).toThrow();
    db = evaluateAlerts(ignoreAlert(db, a.id, "Foto será enviada pela marca", "admin:a", NOW), later(1));
    expect(db.alerts.find((x) => x.id === a.id)!.status).toBe("ignorado");
  });

  it("modo de demonstração gera alertas marcados e é removido por completo", async () => {
    let db = loadDemoData(createInitialDb(NOW.toISOString()), NOW);
    expect(db.offers.every((o) => o.demo)).toBe(true);
    db = (await runChecks(db, { trigger: "manual", now: later(49) })).db;
    db = evaluateAlerts(db, later(49));
    const types = new Set(db.alerts.filter((a) => a.demo).map((a) => a.type));
    for (const t of ["link_afiliado", "indisponivel", "divergencia", "preco_fora_da_curva", "mudanca_vendedor"]) expect(types).toContain(t);
    const cleaned = removeDemoData(db);
    expect(cleaned.offers).toHaveLength(0);
    expect(cleaned.history.some((h) => h.demo)).toBe(false);
    expect(cleaned.runs.some((r) => r.demo)).toBe(false);
  });

  it("lê peso do título do anúncio", () => {
    expect(weightFromTitle("Ração Golden 10,1kg")).toBe(10100);
    expect(weightFromTitle("Sachê 85 g")).toBe(85);
  });
});

describe("filtros da tela de produtos", () => {
  const db = createInitialDb(NOW.toISOString());
  const rows = buildRows(evaluateAlerts(db, NOW));

  it("combina dimensões e conta opções mantendo os outros filtros", () => {
    const f = { especie: ["gatos"], marca: ["Golden"] };
    expect(rows.filter((r) => matchesFilters(r, f)).length).toBe(2);
    const marca = computeFacets(rows, f, {}).find((x) => x.dim === "marca")!;
    expect(marca.options.find((o) => o.value === "Royal Canin")!.count).toBe(2);
  });

  it("sabores com vírgula funcionam na URL", () => {
    const href = productFiltersHref({}, "nome", "asc", { dim: "sabor", value: "Carne, Frango e Cereais" });
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(readProductFilters(params).filters.sabor).toEqual(["Carne, Frango e Cereais"]);
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
