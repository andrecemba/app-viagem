import { describe, expect, it, vi } from "vitest";

import { migrate, openDb } from "@/lib/db";
import { ensureSeed } from "@/lib/db/seed";
import { importCatalogCsv } from "@/lib/domain/catalog-import";
import { getProduct } from "@/lib/domain/products";
import { catalogRow, linksPage, toCsv, type CatalogRow, type MlCatalogProduct } from "@/lib/integrations/ml-catalog";

vi.mock("server-only", () => ({}));

const product = (name: string, attrs: Record<string, string>, id = "MLB51331384"): MlCatalogProduct => ({
  id,
  name,
  domain_id: "MLB-CAT_AND_DOG_FOODS",
  attributes: Object.entries(attrs).map(([k, v]) => ({ id: k, value_name: v })),
});

const trusty = product("Ração Cães Pequenas Adultos 15kg Trustydog", {
  BRAND: "Trustydog",
  LINE: "Premium Especial",
  RECOMMENDED_PET: "Cães",
  PET_LIFE_STAGE: "Adultos",
  BREED_SIZE: "Pequena",
  NET_WEIGHT: "15 kg",
  PET_FOOD_TYPE: "Seca",
  GTIN: "7896097401195",
});

describe("catálogo do Mercado Livre → planilha", () => {
  it("monta a linha com os atributos oficiais", () => {
    const r = catalogRow(trusty);
    expect("row" in r && r.row).toMatchObject({
      especie: "Cachorro",
      marca: "Trustydog",
      linha: "Premium Especial",
      indicacao: "Adultos Pequeno",
      peso: "15 kg",
      idade: "adulto",
      porte: "pequeno",
      tipo: "seca",
      gtin: "7896097401195",
      link_anuncio: "https://www.mercadolivre.com.br/p/MLB51331384",
      id_anuncio: "MLB51331384",
      link_afiliado: "",
    });
  });

  it("sabor “Sem sabor” fica em branco; castrados entram na indicação", () => {
    const r = catalogRow(product("Ração Gatos Castrados Adultos Salmão 10,1kg", { BRAND: "Golden", RECOMMENDED_PET: "Gatos", PET_LIFE_STAGE: "Adultos", NET_WEIGHT: "10.1 kg", FLAVOR: "Sem sabor" }));
    expect("row" in r && r.row).toMatchObject({ especie: "Gato", indicacao: "Adultos Castrados", castrado: "sim", sabor: "", peso: "10,1 kg", porte: "" });
  });

  it("pula o que não dá para identificar, com o motivo", () => {
    expect(catalogRow(product("Kit 3 Rações Golden 1kg", { BRAND: "Golden", RECOMMENDED_PET: "Cães", PET_LIFE_STAGE: "Adultos", NET_WEIGHT: "1 kg", UNITS_PER_PACK: "3" }))).toEqual({ skip: "kit com várias embalagens" });
    expect(catalogRow(product("Ração Premier", { BRAND: "Premier", RECOMMENDED_PET: "Cães", PET_LIFE_STAGE: "Adultos" }))).toEqual({ skip: "sem peso da embalagem" });
    expect(catalogRow(product("Ração Golden 15kg", { BRAND: "Golden", NET_WEIGHT: "15 kg", PET_LIFE_STAGE: "Adultos" }))).toEqual({ skip: "espécie (cão ou gato) não definida" });
    expect(catalogRow({ ...trusty, domain_id: "MLB-PET_SNACKS" })).toEqual({ skip: "não é ração" });
  });

  it("a planilha gerada importa direto, com o link da página de catálogo", async () => {
    const prev = process.env.SEED_DEMO;
    process.env.SEED_DEMO = "0";
    const db = openDb(":memory:");
    migrate(db);
    ensureSeed(db);
    process.env.SEED_DEMO = prev;
    db.prepare("DELETE FROM products").run();

    const row = (catalogRow({ ...trusty, name: 'Ração "Trusty"; 15kg' }) as { row: CatalogRow }).row;
    const lookup = vi.fn(async () => null);
    const [r] = await importCatalogCsv(db, toCsv([row]), "teste", lookup);
    expect(r.status).toBe("pendente");
    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ id: "mercado-livre" }), "MLB51331384", "https://www.mercadolivre.com.br/p/MLB51331384");
    const p = getProduct(db, r.productId!)!;
    expect(p).toMatchObject({ brand: "Trustydog", line: "Premium Especial", indication: "Adultos Pequeno", weightGrams: 15000, lifeStage: "adulto", size: "pequeno", foodType: "seca" });
  });

  it("página de links: um link por produto e campo só para o que vai para a planilha", () => {
    const row = (catalogRow(trusty) as { row: CatalogRow }).row;
    const html = linksPage("Mais vendidas", [
      {
        title: "Cães",
        entries: [
          { position: 1, name: "Trusty <15kg>", imageUrl: null, pageUrl: row.link_anuncio, row, note: null },
          { position: 2, name: "Fórmula Natural", imageUrl: null, pageUrl: "https://www.mercadolivre.com.br/p/MLB22610014", row: null, note: "Já está no site." },
        ],
      },
    ]);
    expect(html).toContain('href="https://www.mercadolivre.com.br/p/MLB51331384"');
    expect(html).toContain("Trusty &lt;15kg&gt;");
    expect(html.match(/<input data-i=/g)).toHaveLength(1);
    expect(html).toContain("Já está no site.");
  });
});
