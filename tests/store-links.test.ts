import { describe, expect, it, vi } from "vitest";

import { migrate, openDb } from "@/lib/db";
import { ensureSeed } from "@/lib/db/seed";
import { importCatalogCsv } from "@/lib/domain/catalog-import";
import { getProduct, productName } from "@/lib/domain/products";
import { pickVtexMatch, productRow, STORE_COLUMNS, storeLinksPage, type VtexProduct } from "@/lib/integrations/store-links";

vi.mock("server-only", () => ({}));

const golden = { brand: "Golden", flavor: "Frango", weightGrams: 10100, lifeStage: "adulto" as const, size: null, neutered: true, gtin: "7896282410110" };
const vtex = (productName: string, link: string, itemName: string, ean: string, price = 161.91): VtexProduct => ({
  productName,
  link,
  items: [{ itemId: "3106318", name: itemName, ean, sellers: [{ commertialOffer: { Price: price, AvailableQuantity: 5 } }] }],
});

describe("Cobasi: achar a mesma ração", () => {
  it("pelo código de barras é certeza", () => {
    const m = pickVtexMatch(golden, [vtex("Ração Golden Gatos Castrados Frango", "https://www.cobasi.com.br/racao-golden-gatos-castrados-frango/p", "10,1kg", "7896282410110")]);
    expect(m).toMatchObject({ sure: true, price: 161.91, available: true, itemId: "3106318" });
  });

  it("pelo nome só com o mesmo peso e sem contradição", () => {
    const noGtin = { ...golden, gtin: null };
    const good = vtex("Ração Golden Gatos Castrados Frango", "https://www.cobasi.com.br/a/p", "10,1kg", "1");
    const wrongWeight = vtex("Ração Golden Gatos Castrados Frango", "https://www.cobasi.com.br/b/p", "3kg", "2");
    const puppy = vtex("Ração Golden Gatos Filhotes Frango", "https://www.cobasi.com.br/c/p", "10,1kg", "3");
    expect(pickVtexMatch(noGtin, [wrongWeight, puppy])).toBeNull();
    expect(pickVtexMatch(noGtin, [wrongWeight, puppy, good])).toMatchObject({ url: "https://www.cobasi.com.br/a/p", sure: false });
  });
});

describe("Cobasi: planilha", () => {
  it("a linha gerada do produto junta a oferta da Cobasi na mesma ração", async () => {
    const prev = process.env.SEED_DEMO;
    process.env.SEED_DEMO = "0";
    const db = openDb(":memory:");
    migrate(db);
    ensureSeed(db);
    process.env.SEED_DEMO = prev;
    db.prepare("DELETE FROM products").run();

    const csv = (rows: Record<string, string>[]) =>
      [STORE_COLUMNS.join(";"), ...rows.map((r) => STORE_COLUMNS.map((c) => r[c] ?? "").join(";"))].join("\n");
    const ml = { especie: "Gato", marca: "Golden", linha: "Premium Especial", indicacao: "Adultos Castrados", sabor: "Frango", peso: "10,1 kg", castrado: "sim", idade: "adulto", link_anuncio: "https://www.mercadolivre.com.br/p/MLB1", id_anuncio: "MLB1" };
    const [first] = await importCatalogCsv(db, csv([ml]), "teste", async () => null);
    const product = getProduct(db, first.productId!)!;

    const row = { ...productRow(product, productName(product)), link_anuncio: "https://www.cobasi.com.br/racao-golden/p", id_anuncio: "3106318", preco: "161,91", disponivel: "sim" };
    const [second] = await importCatalogCsv(db, csv([row]), "teste", async () => null);
    expect(second.productId).toBe(product.id);
    expect((db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n).toBe(1);
    expect(db.prepare("SELECT store_id, price FROM offers WHERE product_id = ? AND store_id = 'cobasi'").get(product.id)).toMatchObject({ price: 161.91 });
  });

  it("página: link achado preenchido, busca para os não achados", () => {
    const html = storeLinksPage(
      "Cobasi",
      [
        { name: "Golden A", imageUrl: null, row: productRow({ species: "gatos", brand: "Golden", line: null, indication: "Adultos", flavor: null, weightGrams: 1000, neutered: false, lifeStage: "adulto", size: null, foodType: "seca", gtin: null } as never, "Golden A"), match: null, searchUrl: "https://www.cobasi.com.br/pesquisa?terms=golden" },
      ],
      "cobasi.csv",
    );
    expect(html).toContain("Não achei automaticamente");
    expect(html).toContain('href="https://www.cobasi.com.br/pesquisa?terms=golden"');
  });
});
