import { createHash } from "node:crypto";

import { weightFromTitle } from "@/lib/domain/validation";

import { cached, requestJson } from "../http";
import { IntegrationError, NO_CAPABILITIES, type NormalizedListing, type OfferSource } from "../types";

/**
 * Shopee: Affiliate Open API (GraphQL), só para contas de afiliado com acesso
 * liberado. Pela documentação pública, a consulta productOfferV2 traz nome,
 * faixa de preço, imagem e link de afiliado; NÃO traz estoque nem frete por CEP.
 * Confirme na documentação da sua conta antes de ligar (SHOPEE_AFFILIATE_ENABLED=1).
 * Sem isso, a Shopee funciona com ofertas cadastradas à mão.
 */

const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

export function parseShopeeUrl(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { externalId: null, hint: "URL inválida." };
  }
  const m = u.pathname.match(/-i\.(\d+)\.(\d+)/) ?? u.pathname.match(/\/product\/(\d+)\/(\d+)/);
  if (m) return { externalId: `${m[1]}.${m[2]}` };
  return { externalId: null, hint: "Não encontramos loja e item na URL (formato …-i.LOJA.ITEM). Digite como LOJA.ITEM ou cadastre sem ID." };
}

export function createShopeeSource({ env, fetchImpl }: { env: Record<string, string | undefined>; fetchImpl?: typeof fetch }): OfferSource {
  const source = "shopee";
  const required = ["SHOPEE_AFFILIATE_APP_ID", "SHOPEE_AFFILIATE_SECRET", "SHOPEE_AFFILIATE_ENABLED"];
  const configured = () => required.every((k) => env[k]) && env.SHOPEE_AFFILIATE_ENABLED === "1";

  async function query<T>(gql: string): Promise<T> {
    if (!configured()) throw new IntegrationError("Shopee sem credenciais da API de afiliados.", "configuracao");
    const payload = JSON.stringify({ query: gql });
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = createHash("sha256").update(`${env.SHOPEE_AFFILIATE_APP_ID}${ts}${payload}${env.SHOPEE_AFFILIATE_SECRET}`).digest("hex");
    const data = await requestJson<{ data?: T; errors?: { message?: string; extensions?: { code?: number } }[] }>(
      ENDPOINT,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `SHA256 Credential=${env.SHOPEE_AFFILIATE_APP_ID}, Timestamp=${ts}, Signature=${signature}`,
        },
        body: payload,
      },
      { source, minIntervalMs: 500, fetchImpl },
    );
    if (data.errors?.length) {
      const msg = data.errors.map((e) => e.message).join("; ");
      throw new IntegrationError(`Shopee: ${msg}`, /auth|permission|signature/i.test(msg) ? "permissao" : "api_mudou");
    }
    if (!data.data) throw new IntegrationError("Resposta da Shopee sem dados.", "api_mudou");
    return data.data;
  }

  return {
    id: source,
    label: "Shopee (API de afiliados)",
    kind: "api",
    terms:
      "Disponível só para afiliados com acesso à Open API. Não traz estoque nem frete por CEP: esses campos ficam “desconhecido”. Preço com variações (faixa) não é importado.",
    status() {
      if (configured()) return { state: "ativa", missingEnv: [], note: "API de afiliados ligada: preço e link de afiliado." };
      return {
        state: "pendente",
        missingEnv: required.filter((k) => !env[k] || (k === "SHOPEE_AFFILIATE_ENABLED" && env[k] !== "1")),
        note: "Peça acesso à Affiliate Open API no painel de afiliados da Shopee e confirme os campos disponíveis para a sua conta.",
      };
    },
    capabilities() {
      if (!configured()) return NO_CAPABILITIES;
      return { searchListings: true, refreshPrice: true, availability: false, shippingQuote: false, affiliateLink: true };
    },
    parseListingUrl: parseShopeeUrl,
    async fetchListing(externalId: string): Promise<NormalizedListing> {
      const m = externalId.match(/^(\d+)\.(\d+)$/);
      if (!m) throw new IntegrationError(`ID inválido para a Shopee (use LOJA.ITEM): ${externalId}`, "dados");
      const data = await cached(`shopee:${externalId}`, 10 * 60_000, () =>
        query<{ productOfferV2?: { nodes?: { productName?: string; priceMin?: string; priceMax?: string; offerLink?: string; productLink?: string; imageUrl?: string }[] } }>(
          `{ productOfferV2(shopId: ${m[1]}, itemId: ${m[2]}) { nodes { productName priceMin priceMax offerLink productLink imageUrl } } }`,
        ),
      );
      const node = data.productOfferV2?.nodes?.[0];
      if (!data.productOfferV2) throw new IntegrationError("Resposta da Shopee em formato inesperado.", "api_mudou");
      if (!node) throw new IntegrationError("Anúncio não encontrado na API de afiliados.", "nao_encontrado");
      const min = Number(node.priceMin);
      const max = Number(node.priceMax);
      if (Number.isFinite(min) && Number.isFinite(max) && min !== max) {
        throw new IntegrationError("Anúncio com variações de preço (faixa): cadastre o preço da embalagem certa manualmente.", "dados");
      }
      return {
        externalId,
        url: node.productLink ?? null,
        title: node.productName ?? null,
        price: Number.isFinite(min) && min > 0 ? min : null,
        currency: "BRL",
        availability: "desconhecida",
        freeShipping: null,
        imageUrl: node.imageUrl ?? null,
        listingWeightGrams: weightFromTitle(node.productName),
        listingFlavor: null,
        affiliateUrl: node.offerLink ?? null,
        obtainedAt: new Date().toISOString(),
      };
    },
  };
}
