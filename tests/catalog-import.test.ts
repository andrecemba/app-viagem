import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { migrate, openDb } from "@/lib/db";
import { ensureSeed } from "@/lib/db/seed";
import { importCatalogCsv, importCatalogRows, parseWeight } from "@/lib/domain/catalog-import";
import { getOffer } from "@/lib/domain/offers";
import { getProduct } from "@/lib/domain/products";
import type { NormalizedListing } from "@/lib/integrations/types";
import { isXlsx, readXlsxRows } from "@/lib/integrations/xlsx";

vi.mock("server-only", () => ({}));

function emptyDb() {
  const prev = process.env.SEED_DEMO;
  process.env.SEED_DEMO = "0";
  const db = openDb(":memory:");
  migrate(db);
  ensureSeed(db);
  process.env.SEED_DEMO = prev;
  db.prepare("DELETE FROM products").run();
  return db;
}

const userFile = readFileSync("docs/importar/formula-natural-fresh-meat.csv", "utf8");
const withValues = (peso: string, preco: string) => userFile.replace("Filhotes Mini e Pequeno;;;", `Filhotes Mini e Pequeno;;${peso};`).replace("MLB7125580428;;", `MLB7125580428;${preco};`);

describe("importação de planilha", () => {
  it("lê peso com ou sem unidade", () => {
    expect(parseWeight("2,5 kg")).toBe(2500);
    expect(parseWeight("800 g")).toBe(800);
    expect(parseWeight("15")).toBe(15000);
    expect(parseWeight("")).toBeNull();
  });

  it("sem peso confirmado não cria nada e aponta o que está pendente", async () => {
    const db = emptyDb();
    const [r] = await importCatalogCsv(db, userFile, "teste");
    expect(r.status).toBe("pendente");
    expect(r.productId).toBeNull();
    expect(r.pending).toEqual(expect.arrayContaining(["peso da embalagem", "sabor"]));
    expect((db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n).toBe(0);
  });

  it("com peso e preço cria produto e oferta, guarda o link de afiliado da coluna e não duplica", async () => {
    const db = emptyDb();
    const csv = withValues("2,5 kg", "149,90");
    const [r] = await importCatalogCsv(db, csv, "teste");
    expect(r.offerId).not.toBeNull();
    const offer = getOffer(db, r.offerId!)!;
    expect(offer.externalId).toBe("MLB7125580428");
    expect(offer.storeId).toBe("mercado-livre");
    expect(offer.affiliateUrl).toBe("https://meli.la/17cvoar");
    expect(offer.price).toBe(149.9);
    expect(offer.dataSource).toBe("manual");
    const product = getProduct(db, r.productId!)!;
    expect(product).toMatchObject({ brand: "Fórmula Natural", weightGrams: 2500, lifeStage: "filhote", size: "mini_pequeno", flavor: null });
    expect(r.status).toBe("pendente"); // sabor e selo de frete não conferidos
    expect(offer.notes).toMatch(/Pendente de verificação: .*sabor/);

    const [again] = await importCatalogCsv(db, csv, "teste");
    expect(again.status).toBe("ja_existia");
    expect((db.prepare("SELECT COUNT(*) AS n FROM offers").get() as { n: number }).n).toBe(1);
  });

  it("com a API ligada completa peso, sabor, preço e frete pelo anúncio oficial", async () => {
    const db = emptyDb();
    const listing: NormalizedListing = {
      externalId: "MLB7125580428",
      url: null,
      title: "Ração Fórmula Natural Fresh Meat Filhotes Mini e Pequeno 2,5 kg",
      price: 139.9,
      currency: "BRL",
      availability: "disponivel",
      freeShipping: true,
      imageUrl: "https://http2.mlstatic.com/foto.jpg",
      listingWeightGrams: 2500,
      listingFlavor: "Frango",
      affiliateUrl: null,
      obtainedAt: new Date().toISOString(),
    };
    const lookup = vi.fn(async () => listing);
    const [r] = await importCatalogCsv(db, userFile, "teste", lookup);
    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ id: "mercado-livre" }), "MLB7125580428");
    expect(r.status).toBe("importado");
    const offer = getOffer(db, r.offerId!)!;
    expect(offer).toMatchObject({ dataSource: "api", price: 139.9, freeShipping: true, matchStatus: "confirmada" });
    expect(getProduct(db, r.productId!)).toMatchObject({ weightGrams: 2500, flavor: "Frango" });
  });

  it("falha da API não inventa dados: usa só a planilha", async () => {
    const db = emptyDb();
    const [r] = await importCatalogCsv(db, userFile, "teste", async () => {
      throw new Error("HTTP 403");
    });
    expect(r.productId).toBeNull();
    expect(r.messages.join(" ")).toMatch(/não respondeu/);
  });

  it("lê .xlsx do Google Planilhas e não cria produto para anúncio repetido", async () => {
    const data = readFileSync("tests/fixtures/planilha-google.xlsx");
    expect(isXlsx(data)).toBe(true);
    const rows = readXlsxRows(data);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ especie: "Cachorro", marca: "Fórmula Natural", peso: "2,5kg", id_anuncio: "MLB7125580428", link_afiliado: "https://meli.la/17cvoar" });
    expect(rows[0].link_anuncio).toContain("#polycard_client=affiliates&wid=MLB7125580428");
    expect(rows[1].preco).toBe("99");

    const db = emptyDb();
    const [first, second] = await importCatalogRows(db, rows, "teste");
    expect(first.productId).not.toBeNull();
    expect(getProduct(db, first.productId!)).toMatchObject({ weightGrams: 2500, flavor: "Frango e mandioca", foodType: null });
    expect(first.messages.join(" ")).toMatch(/Tipo “protetor da saúde bucal” não reconhecido/);
    expect(first.pending).toContain("preço");
    expect(second.status).toBe("ja_existia");
    expect(second.messages.join(" ")).toMatch(/já está cadastrado em/);
    expect((db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n).toBe(1);
  });

  it("recusa espécie desconhecida e cabeçalho errado", async () => {
    const db = emptyDb();
    const [r] = await importCatalogCsv(db, userFile.replace("\nCachorro;", "\nPeixe;"), "teste");
    expect(r.status).toBe("erro");
    await expect(importCatalogCsv(db, "nome;preco\nx;1", "teste")).rejects.toThrow(/Faltam colunas/);
  });
});
