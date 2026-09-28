import { describe, expect, it } from "vitest";

import { checkAffiliateLink, checkUrlText, listingIds } from "@/lib/domain/listing-check";

const product = { brand: "Fórmula Natural", flavor: "Frango e mandioca", weightGrams: 2500, lifeStage: "filhote" as const, size: "mini_pequeno" as const, neutered: false };
const amazon = { domains: ["amazon.com.br"], affiliateDomains: ["amzn.to", "link.amazon"] };

describe("conferência pelo endereço", () => {
  it("acusa anúncio de adulto quando o produto é para filhote (a busca na query não conta)", () => {
    const url =
      "https://www.amazon.com.br/F%C3%B3rmula-Natural-Freshmeat-Adultos-Pequeno/dp/B084P7CBD6/ref=sr_1_6?keywords=F%C3%B3rmula+Natural+Filhote+Frango+2%2C5+kg";
    const lines = checkUrlText(product, url);
    expect(lines.some((l) => !l.ok && l.message.includes("adulto"))).toBe(true);
  });

  it("aceita o anúncio certo e lembra que o Mercado Livre tira a vírgula do peso", () => {
    const lines = checkUrlText(product, "https://www.mercadolivre.com.br/formula-natural-fresh-meat-cao-filhote-mini-e-pequeno-cao-filhote-25kg/p/MLB22610014");
    expect(lines).toHaveLength(1);
    expect(lines[0].message).toContain("sem a vírgula");
  });

  it("confere peso, sabor, porte e marca", () => {
    expect(checkUrlText(product, "https://www.loja.com.br/formula-natural-filhote-mini-pequeno-frango-2-5kg")).toEqual([
      { ok: true, message: expect.stringContaining("Nada no endereço") },
    ]);
    const bad = checkUrlText(product, "https://www.loja.com.br/golden-filhote-porte-grande-carne-15kg").map((l) => l.message);
    expect(bad.join(" | ")).toMatch(/médio\/grande.*15 kg.*carne.*marca/);
  });

  it("endereço sem nome do produto pede conferência na página", () => {
    const [line] = checkUrlText(product, "https://www.amazon.com.br/dp/B084P7CBD6");
    expect(line.ok).toBe(false);
    expect(line.message).toContain("não traz o nome");
  });
});

describe("conferência do link de afiliado", () => {
  const redirect = (to: string) => new Response(null, { status: 301, headers: { location: to } });

  it("segue o link curto e confirma o mesmo anúncio (com a etiqueta de afiliado)", async () => {
    const fetchImpl = (async () => redirect("https://www.amazon.com.br/dp/B084P7CBD6?tag=menorpreco014-20")) as typeof fetch;
    const r = await checkAffiliateLink(amazon, "https://www.amazon.com.br/Formula/dp/B084P7CBD6/ref=sr_1_6", "https://link.amazon/B0dCOJrjo", fetchImpl);
    expect(r).toMatchObject({ status: "mesmo", tag: "menorpreco014-20" });
  });

  it("acusa link de afiliado de outro anúncio", async () => {
    const fetchImpl = (async () => redirect("https://www.amazon.com.br/dp/B000000000")) as typeof fetch;
    const r = await checkAffiliateLink(amazon, "https://www.amazon.com.br/dp/B084P7CBD6", "https://amzn.to/abc", fetchImpl);
    expect(r.status).toBe("diferente");
  });

  it("não segue para fora da loja", async () => {
    const fetchImpl = (async () => redirect("https://exemplo.com/golpe")) as typeof fetch;
    const r = await checkAffiliateLink(amazon, "https://www.amazon.com.br/dp/B084P7CBD6", "https://amzn.to/abc", fetchImpl);
    expect(r.status).toBe("sem_conferencia");
  });

  it("Mercado Livre: link de catálogo e anúncio batem pelo número", () => {
    const page = "https://www.mercadolivre.com.br/formula/p/MLB22610014#polycard_client=affiliates&wid=MLB7125580428";
    expect(listingIds(page)).toEqual(expect.arrayContaining(["MLB22610014", "MLB7125580428"]));
  });
});
