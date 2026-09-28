import { describe, expect, it, vi } from "vitest";

import { parseAmazonUrl, createAmazonSource } from "@/lib/integrations/adapters/amazon";
import { parseGenericUrl } from "@/lib/integrations/adapters/manual";
import { codeFromRedirect, createMercadoLivreSource, parseMercadoLivreUrl } from "@/lib/integrations/adapters/mercado-livre";
import { createShopeeSource, parseShopeeUrl } from "@/lib/integrations/adapters/shopee";
import { clearIntegrationCache, redact } from "@/lib/integrations/http";
import { IntegrationError } from "@/lib/integrations/types";

vi.mock("server-only", () => ({}));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("extração do ID do anúncio", () => {
  it("Mercado Livre: anúncio do vendedor quando o link traz; senão, a página de catálogo", () => {
    expect(parseMercadoLivreUrl("https://produto.mercadolivre.com.br/MLB-1234567890-racao-golden-15kg-_JM").externalId).toBe("MLB1234567890");
    expect(parseMercadoLivreUrl("https://www.mercadolivre.com.br/racao/p/MLB19876543?wid=MLB555666777").externalId).toBe("MLB555666777");
    // link vindo do programa de afiliados: wid depois do #, e um "deal:MLB…" que não é anúncio
    expect(
      parseMercadoLivreUrl(
        "https://www.mercadolivre.com.br/formula-natural-fresh-meat-cao-filhote-mini-e-pequeno-cao-filhote-25kg/p/MLB22610014?pdp_filters=deal%3AMLB1578289-1&extra_comm=false#polycard_client=affiliates&wid=MLB7125580428&sid=affiliates",
      ).externalId,
    ).toBe("MLB7125580428");
    // "deal:MLB…" não é anúncio: fica o ID da página de catálogo
    expect(parseMercadoLivreUrl("https://www.mercadolivre.com.br/racao/p/MLB19876543?pdp_filters=deal%3AMLB1578289-1").externalId).toBe("MLB19876543");
    const cat = parseMercadoLivreUrl("https://www.mercadolivre.com.br/p/MLB19876543");
    expect(cat.externalId).toBe("MLB19876543");
    expect(cat.hint).toMatch(/menor preço/);
  });

  it("Shopee, Amazon e lojas manuais", () => {
    expect(parseShopeeUrl("https://shopee.com.br/Racao-Golden-15kg-i.123456.987654321").externalId).toBe("123456.987654321");
    expect(parseAmazonUrl("https://www.amazon.com.br/Nestl%C3%A9-Purina/dp/B07Y2BYSGD?ref=x").externalId).toBe("B07Y2BYSGD");
    expect(parseGenericUrl("https://www.petz.com.br/produto/racao-royal-canin-mini-caes-adultos-71733").externalId).toBe("71733");
  });
});

describe("Mercado Livre (API oficial)", () => {
  const env = { MERCADOLIVRE_ACCESS_TOKEN: "tok-secreto" };

  it("sem credenciais: pendente e sem capacidades", () => {
    const src = createMercadoLivreSource({ env: {} });
    expect(src.status().state).toBe("pendente");
    expect(src.status().missingEnv).toContain("MERCADOLIVRE_CLIENT_ID");
    expect(src.capabilities().refreshPrice).toBe(false);
  });

  it("normaliza o anúncio; link de afiliado nunca vem da URL", async () => {
    clearIntegrationCache();
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.mercadolibre.com/items/MLB1234567");
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer tok-secreto");
      return json({
        id: "MLB1234567",
        title: "Ração Golden Fórmula Adultos Frango 15 kg",
        price: 189.9,
        currency_id: "BRL",
        status: "active",
        available_quantity: 3,
        permalink: "https://produto.mercadolivre.com.br/MLB-1234567-x",
        shipping: { free_shipping: true },
        attributes: [{ id: "FLAVOR", value_name: "Frango" }],
      });
    });
    const src = createMercadoLivreSource({ env, fetchImpl: fetchImpl as typeof fetch });
    const l = await src.fetchListing!("MLB1234567");
    expect(l).toMatchObject({ price: 189.9, availability: "disponivel", freeShipping: true, listingWeightGrams: 15000, listingFlavor: "Frango", affiliateUrl: null });
  });

  it("403 vira falha de permissão (sem nova tentativa) e mudança de formato vira api_mudou", async () => {
    clearIntegrationCache();
    const forbidden = vi.fn(async () => json({ message: "forbidden" }, 403));
    const src = createMercadoLivreSource({ env, fetchImpl: forbidden as typeof fetch });
    await expect(src.fetchListing!("MLB1234568")).rejects.toMatchObject({ kind: "permissao", status: 403 });
    expect(forbidden).toHaveBeenCalledTimes(1);

    clearIntegrationCache();
    const changed = createMercadoLivreSource({ env, fetchImpl: (async () => json({ id: "MLB1234569", preco: "x" })) as typeof fetch });
    await expect(changed.fetchListing!("MLB1234569")).rejects.toBeInstanceOf(IntegrationError);
  });

  it("tenta de novo em erro temporário (5xx) e depois funciona", async () => {
    clearIntegrationCache();
    let calls = 0;
    const flaky = vi.fn(async () => (++calls === 1 ? json({}, 503) : json({ id: "MLB1234570", title: "x 1kg", price: 10, status: "paused", available_quantity: 0 })));
    const src = createMercadoLivreSource({ env, fetchImpl: flaky as typeof fetch });
    const l = await src.fetchListing!("MLB1234570");
    expect(calls).toBe(2);
    expect(l.availability).toBe("indisponivel");
  });

  it("frete por CEP escolhe a opção mais barata", async () => {
    const src = createMercadoLivreSource({
      env,
      fetchImpl: (async () => json({ options: [{ cost: 19.9, estimated_delivery_time: { shipping: 72 } }, { cost: 0, estimated_delivery_time: { shipping: 120 } }] })) as typeof fetch,
    });
    expect(await src.quoteShipping!("MLB1234567", "80010000")).toEqual({ cost: 0, currency: "BRL", deadlineDays: 5 });
  });
});

describe("Shopee e Amazon", () => {
  it("Shopee só liga com acesso confirmado e recusa preço em faixa", async () => {
    expect(createShopeeSource({ env: { SHOPEE_AFFILIATE_APP_ID: "a", SHOPEE_AFFILIATE_SECRET: "b" } }).status().state).toBe("pendente");
    const env = { SHOPEE_AFFILIATE_APP_ID: "a", SHOPEE_AFFILIATE_SECRET: "b", SHOPEE_AFFILIATE_ENABLED: "1" };
    const src = createShopeeSource({
      env,
      fetchImpl: (async (_u: unknown, init?: RequestInit) => {
        expect(String((init?.headers as Record<string, string>).authorization)).toMatch(/^SHA256 Credential=a, Timestamp=\d+, Signature=[0-9a-f]{64}$/);
        return json({ data: { productOfferV2: { nodes: [{ productName: "Ração 10kg", priceMin: "100", priceMax: "150", offerLink: "https://s.shopee.com.br/x" }] } } });
      }) as typeof fetch,
    });
    await expect(src.fetchListing!("1.2")).rejects.toMatchObject({ kind: "dados" });
  });

  it("Amazon fica pendente e não importa preço", () => {
    const src = createAmazonSource({ env: { AMAZON_CREATORS_API_CLIENT_ID: "x", AMAZON_CREATORS_API_CLIENT_SECRET: "y", AMAZON_ASSOCIATE_TAG: "z" } });
    expect(src.status().state).toBe("pendente");
    expect(src.fetchListing).toBeUndefined();
    expect(src.capabilities().refreshPrice).toBe(false);
  });
});

describe("registro de erros", () => {
  it("não expõe credenciais", () => {
    expect(redact("GET /x?access_token=abc123&y=1 Authorization: Bearer eyJhbGci.x")).toBe("GET /x?access_token=***&y=1 Authorization: Bearer ***");
  });
});

describe("links do Mercado Livre copiados do navegador", () => {
  it("entende o anúncio escolhido dentro da página de catálogo", () => {
    expect(parseMercadoLivreUrl("https://www.mercadolivre.com.br/racao/p/MLB12345678?pdp_filters=item_id%3AMLB3344556677").externalId).toBe("MLB3344556677");
    expect(parseMercadoLivreUrl("https://www.mercadolivre.com.br/racao/up/MLBU123456789?pdp_filters=item_id:MLB998877665").externalId).toBe("MLB998877665");
  });
});

describe("Mercado Livre: anúncio bloqueado cai para a lista do catálogo", () => {
  const catalogUrl = "https://www.mercadolivre.com.br/racao/p/MLB22610014#polycard_client=affiliates&wid=MLB7125580428";
  const mock = (items: unknown) =>
    vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/items/MLB")) return new Response("{}", { status: 403 });
      if (u.endsWith("/products/MLB22610014")) return Response.json({ name: "Fórmula Natural Fresh Meat Cão Filhote Mini e Pequeno 2,5kg", pictures: [{ url: "http://img/x.jpg" }], attributes: [{ id: "FLAVOR", value_name: "Frango" }] });
      if (u.endsWith("/products/MLB22610014/items")) return Response.json(items);
      return new Response("{}", { status: 404 });
    });

  it("usa preço e frete da oferta do mesmo anúncio na página de catálogo", async () => {
    clearIntegrationCache();
    const fetchImpl = mock({ results: [{ item_id: "MLB1", price: 120 }, { item_id: "MLB7125580428", price: 139.9, currency_id: "BRL", shipping: { free_shipping: true } }] });
    const src = createMercadoLivreSource({ env: { MERCADOLIVRE_ACCESS_TOKEN: "t" }, fetchImpl: fetchImpl as unknown as typeof fetch });
    const l = await src.fetchListing!("MLB7125580428", { url: catalogUrl });
    expect(l).toMatchObject({ via: "catalogo", price: 139.9, freeShipping: true, availability: "disponivel", listingWeightGrams: 2500, listingFlavor: "Frango", imageUrl: "https://img/x.jpg" });
  });

  it("não usa a oferta de outro vendedor: sem o anúncio na lista, falha", async () => {
    clearIntegrationCache();
    const fetchImpl = mock({ results: [{ item_id: "MLB1", price: 120 }] });
    const src = createMercadoLivreSource({ env: { MERCADOLIVRE_ACCESS_TOKEN: "t" }, fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(src.fetchListing!("MLB7125580428", { url: catalogUrl })).rejects.toMatchObject({ kind: "nao_encontrado" });
    // sem link de catálogo, continua o 403 original
    await expect(src.fetchListing!("MLB7125580429")).rejects.toMatchObject({ kind: "permissao" });
  });
});

describe("Mercado Livre: link só da página de catálogo acompanha o menor preço", () => {
  const url = "https://www.mercadolivre.com.br/p/MLB22610014";
  const mock = (items: unknown) =>
    vi.fn(async (u: string | URL | Request) => {
      const s = String(u);
      if (s.endsWith("/products/MLB22610014")) return Response.json({ name: "Fórmula Natural Fresh Meat Cão Filhote 2,5kg", attributes: [{ id: "NET_WEIGHT", value_name: "2.5 kg" }] });
      if (s.endsWith("/products/MLB22610014/items")) return Response.json(items);
      return new Response("{}", { status: 404 });
    });

  it("pega o menor preço entre os vendedores, só produto novo", async () => {
    clearIntegrationCache();
    const fetchImpl = mock({
      results: [
        { item_id: "MLB1", price: 110, condition: "new", shipping: { free_shipping: false } },
        { item_id: "MLB2", price: 90, condition: "used" },
        { item_id: "MLB3", price: 103, condition: "new", shipping: { free_shipping: true } },
      ],
    });
    const src = createMercadoLivreSource({ env: { MERCADOLIVRE_ACCESS_TOKEN: "t" }, fetchImpl: fetchImpl as unknown as typeof fetch });
    const l = await src.fetchListing!("MLB22610014", { url });
    expect(l).toMatchObject({ externalId: "MLB22610014", via: "catalogo_menor_preco", price: 103, freeShipping: true, availability: "disponivel", listingWeightGrams: 2500 });
    expect(fetchImpl.mock.calls.some(([u]) => String(u).includes("/items/MLB22610014"))).toBe(false);
  });

  it("catálogo sem vendedor: indisponível e sem preço", async () => {
    clearIntegrationCache();
    const src = createMercadoLivreSource({ env: { MERCADOLIVRE_ACCESS_TOKEN: "t" }, fetchImpl: mock({ results: [] }) as unknown as typeof fetch });
    expect(await src.fetchListing!("MLB22610014", { url })).toMatchObject({ price: null, availability: "indisponivel" });
  });
});

describe("codeFromRedirect (npm run ml:conectar)", () => {
  it("tira o código do endereço de retorno ou aceita o código puro", () => {
    expect(codeFromRedirect("https://www.google.com.br/?code=TG-65f1a2b3c4-123456")).toBe("TG-65f1a2b3c4-123456");
    expect(codeFromRedirect("  TG-abc123-99  ")).toBe("TG-abc123-99");
    expect(codeFromRedirect("https://www.google.com.br/")).toBeNull();
    expect(codeFromRedirect("qualquer coisa")).toBeNull();
    // colado sem o "TG-" ou com o "?code=" do DevTools
    expect(codeFromRedirect("6aba8e6e63b23900015336f6-245781296")).toBe("TG-6aba8e6e63b23900015336f6-245781296");
    expect(codeFromRedirect("?code=TG-6aba8e6e63b23900015336f6-245781296")).toBe("TG-6aba8e6e63b23900015336f6-245781296");
  });
});
