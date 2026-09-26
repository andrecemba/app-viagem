import { describe, expect, it } from "vitest";

import {
  buildAffiliateUrl,
  buildAmazonUrl,
  buildAwinUrl,
  extractAsin,
  getAffiliateConfigFromEnv,
  type AffiliateConfig,
} from "@/lib/affiliate";

const config: AffiliateConfig = {
  amazon: { tags: { racao: "site-racao-20", petisco: "site-petisco-20", default: "site-20" } },
  awin: { affiliateId: "123456", merchantIds: { cobasi: "17666" } },
};

describe("extractAsin", () => {
  it.each([
    ["https://www.amazon.com.br/Racao-Golden/dp/B0ABC12345?ref=sr_1_1", "B0ABC12345"],
    ["https://amazon.com.br/dp/b0abc12345", "B0ABC12345"],
    ["https://www.amazon.com.br/gp/product/B0ABC12345/ref=ox_sc", "B0ABC12345"],
    ["https://m.amazon.com.br/gp/aw/d/B0ABC12345", "B0ABC12345"],
  ])("extrai o ASIN de %s", (url, asin) => {
    expect(extractAsin(url)).toBe(asin);
  });

  it("ignora outros domínios e URLs sem ASIN", () => {
    expect(extractAsin("https://www.amazon.com/dp/B0ABC12345")).toBeNull();
    expect(extractAsin("https://www.amazon.com.br/s?k=racao")).toBeNull();
    expect(extractAsin("não é url")).toBeNull();
  });
});

describe("buildAmazonUrl", () => {
  it("normaliza e remove outros parâmetros de rastreio", () => {
    expect(
      buildAmazonUrl("https://www.amazon.com.br/Racao/dp/B0ABC12345?ref=abc&tag=outra-20&crid=XYZ", "site-racao-20"),
    ).toBe("https://www.amazon.com.br/dp/B0ABC12345?tag=site-racao-20");
  });
});

describe("buildAwinUrl", () => {
  it("monta o deeplink com a URL codificada", () => {
    expect(buildAwinUrl("https://www.cobasi.com.br/racao-x/p?sku=1&a=b", "17666", "123456")).toBe(
      "https://www.awin1.com/cread.php?awinmid=17666&awinaffid=123456&ued=https%3A%2F%2Fwww.cobasi.com.br%2Fracao-x%2Fp%3Fsku%3D1%26a%3Db",
    );
  });
});

describe("buildAffiliateUrl — cadeia de tentativas", () => {
  const base = { url: "https://www.amazon.com.br/x/dp/B0ABC12345?ref=1", storeSlug: "amazon", network: "amazon" as const, tagCategory: "racao" as const };

  it("1. prioriza o link da API oficial", () => {
    const r = buildAffiliateUrl({ ...base, apiUrl: "https://s.shopee.com.br/abc", manualUrl: "https://x.com/m" }, config);
    expect(r).toEqual({ url: "https://s.shopee.com.br/abc", source: "api", affiliateStatus: "ok" });
  });

  it("2. usa o link manual do admin quando não há link de API", () => {
    const r = buildAffiliateUrl({ ...base, network: "mercadolivre", storeSlug: "mercado-livre", manualUrl: "https://mercadolivre.com/sec/abc" }, config);
    expect(r.source).toBe("manual");
    expect(r.url).toBe("https://mercadolivre.com/sec/abc");
  });

  it("ignora links de API/manuais inválidos", () => {
    const r = buildAffiliateUrl({ ...base, apiUrl: "javascript:alert(1)", manualUrl: "" }, config);
    expect(r.source).toBe("rule");
  });

  it("3. constrói por regra (Amazon) com tag por categoria", () => {
    expect(buildAffiliateUrl(base, config).url).toBe("https://www.amazon.com.br/dp/B0ABC12345?tag=site-racao-20");
    expect(buildAffiliateUrl({ ...base, tagCategory: "petisco" }, config).url).toContain("tag=site-petisco-20");
    expect(buildAffiliateUrl({ ...base, tagCategory: "complementar" }, config).url).toContain("tag=site-20");
  });

  it("3. constrói por regra (Awin) para lojas com MID configurado", () => {
    const r = buildAffiliateUrl({ url: "https://www.cobasi.com.br/p", storeSlug: "cobasi", network: "awin", tagCategory: "racao" }, config);
    expect(r.source).toBe("rule");
    expect(r.url.startsWith("https://www.awin1.com/cread.php?awinmid=17666&awinaffid=123456&ued=")).toBe(true);
  });

  it("4. cai no link comum e marca como `missing`", () => {
    const plain = "https://www.petlove.com.br/racao/p";
    expect(buildAffiliateUrl({ url: plain, storeSlug: "petlove", network: null, tagCategory: "racao" }, config)).toEqual({
      url: plain,
      source: "plain",
      affiliateStatus: "missing",
    });
    const noTag: AffiliateConfig = { ...config, amazon: { tags: {} } };
    expect(buildAffiliateUrl(base, noTag).affiliateStatus).toBe("missing");
  });
});

describe("getAffiliateConfigFromEnv", () => {
  it("lê tags e IDs das variáveis de ambiente, ignorando vazias", () => {
    const c = getAffiliateConfigFromEnv({ AMAZON_TAG_RACAO: " minha-20 ", AMAZON_TAG_PETISCO: "", AWIN_AFFILIATE_ID: "1", AWIN_MID_COBASI: "2" });
    expect(c.amazon.tags.racao).toBe("minha-20");
    expect(c.amazon.tags.petisco).toBeUndefined();
    expect(c.awin).toEqual({ affiliateId: "1", merchantIds: { cobasi: "2" } });
  });
});
