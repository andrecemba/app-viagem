import type { AffiliateNetwork, AffiliateStatus } from "@/types/catalog";

import type { AffiliateConfig, AffiliateTagCategory } from "./config";

export interface AffiliateInput {
  /** URL exata do produto na loja. */
  url: string;
  storeSlug: string;
  network: AffiliateNetwork;
  /** 1. Link gerado pela API oficial (ex.: Shopee `generateShortLink`), em cache. */
  apiUrl?: string | null;
  /** 2. Link cadastrado manualmente pelo admin (ex.: link curto do Mercado Livre). */
  manualUrl?: string | null;
  tagCategory: AffiliateTagCategory;
}

export type AffiliateSource = "api" | "manual" | "rule" | "plain";

export interface AffiliateResult {
  url: string;
  source: AffiliateSource;
  affiliateStatus: AffiliateStatus;
}

const AMAZON_HOSTS = new Set(["amazon.com.br", "www.amazon.com.br", "m.amazon.com.br", "smile.amazon.com.br"]);
const ASIN_PATTERN = /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN|o\/ASIN)\/([A-Z0-9]{10})(?=[/?#]|$)/i;

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function extractAsin(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed || !AMAZON_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  const match = parsed.pathname.match(ASIN_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

/** Normaliza para https://www.amazon.com.br/dp/{ASIN}?tag={TAG}, descartando outros parâmetros de rastreio. */
export function buildAmazonUrl(url: string, tag: string): string | null {
  const asin = extractAsin(url);
  if (!asin || !tag) return null;
  return `https://www.amazon.com.br/dp/${asin}?tag=${encodeURIComponent(tag)}`;
}

/** Deeplink no formato da Awin: cread.php?awinmid={MID}&awinaffid={ID}&ued={URL codificada}. */
export function buildAwinUrl(url: string, merchantId: string, affiliateId: string): string | null {
  if (!parseUrl(url) || !merchantId || !affiliateId) return null;
  return `https://www.awin1.com/cread.php?awinmid=${encodeURIComponent(merchantId)}&awinaffid=${encodeURIComponent(affiliateId)}&ued=${encodeURIComponent(url)}`;
}

function isHttpUrl(value: string | null | undefined): value is string {
  const parsed = value ? parseUrl(value) : null;
  return !!parsed && (parsed.protocol === "https:" || parsed.protocol === "http:");
}

function buildByRule(input: AffiliateInput, config: AffiliateConfig): string | null {
  switch (input.network) {
    case "amazon": {
      const tag = config.amazon.tags[input.tagCategory] ?? config.amazon.tags.default;
      return tag ? buildAmazonUrl(input.url, tag) : null;
    }
    case "awin": {
      const mid = config.awin.merchantIds[input.storeSlug];
      return mid && config.awin.affiliateId ? buildAwinUrl(input.url, mid, config.awin.affiliateId) : null;
    }
    // Mercado Livre: sem API pública de geração de link — depende do link manual (passo 2).
    // Shopee: link vem da Affiliate Open API (passo 1).
    // TODO(você): confirmar se o Parceiro Petz permite deeplink para produto.
    default:
      return null;
  }
}

/**
 * Cadeia "sempre tentar receber comissão":
 * 1. link da API oficial → 2. link manual do admin → 3. link por regra → 4. link comum (`missing`).
 */
export function buildAffiliateUrl(input: AffiliateInput, config: AffiliateConfig): AffiliateResult {
  if (isHttpUrl(input.apiUrl)) return { url: input.apiUrl, source: "api", affiliateStatus: "ok" };
  if (isHttpUrl(input.manualUrl)) return { url: input.manualUrl, source: "manual", affiliateStatus: "ok" };
  const ruleUrl = buildByRule(input, config);
  if (ruleUrl) return { url: ruleUrl, source: "rule", affiliateStatus: "ok" };
  return { url: input.url, source: "plain", affiliateStatus: "missing" };
}
