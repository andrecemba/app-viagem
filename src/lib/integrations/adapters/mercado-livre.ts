import { weightFromTitle } from "@/lib/domain/validation";

import { cached, requestJson } from "../http";
import { IntegrationError, NO_CAPABILITIES, type NormalizedListing, type OfferSource, type ShippingQuoteResult } from "../types";

/**
 * Mercado Livre: API oficial (api.mercadolibre.com) com aplicativo registrado.
 *  - GET /items/{id}                         → preço, status, estoque, frete grátis, atributos
 *  - GET /items/{id}/shipping_options?zip_code → cotação de frete para um CEP
 * O acesso exige token OAuth do aplicativo; sem permissão (401/403) a consulta
 * falha e o último preço válido é mantido. O link de afiliado é gerado no painel
 * de afiliados e cadastrado à parte: nunca é montado a partir da URL.
 */

const API = "https://api.mercadolibre.com";

export interface TokenStore {
  get(): string | null;
  set(refreshToken: string): void;
}

export interface MercadoLivreDeps {
  env: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  tokenStore?: TokenStore;
}

interface MlItem {
  id: string;
  title?: string;
  price?: number | null;
  currency_id?: string;
  status?: string;
  available_quantity?: number;
  permalink?: string;
  thumbnail?: string;
  pictures?: { secure_url?: string }[];
  shipping?: { free_shipping?: boolean };
  attributes?: { id: string; value_name?: string | null }[];
}

export function parseMercadoLivreUrl(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { externalId: null, hint: "URL inválida." };
  }
  // Página de catálogo às vezes traz o anúncio escolhido: ?wid=MLB..., ?item_id=MLB... ou pdp_filters=item_id:MLB...
  const fromQuery = u.searchParams.get("wid") ?? u.searchParams.get("item_id") ?? u.searchParams.get("pdp_filters")?.match(/item_id:(MLB\d+)/i)?.[1] ?? null;
  const m = (fromQuery ?? u.pathname).match(/MLB-?(\d{6,})/i);
  if (m && !(u.pathname.includes("/p/") && !fromQuery)) return { externalId: `MLB${m[1]}` };
  if (u.pathname.includes("/p/")) {
    return {
      externalId: null,
      hint: "Link de página de catálogo (/p/…), que junta vários vendedores. Para oferta manual pode deixar sem ID; para usar a API depois, abra o anúncio do vendedor e cole o link dele (ou digite o ID MLB).",
    };
  }
  return { externalId: null, hint: "Não encontramos o ID do anúncio (MLB…). Digite-o no campo abaixo." };
}

/** Aceita o endereço inteiro para onde o Mercado Livre mandou (…?code=TG-…) ou só o código. */
export function codeFromRedirect(input: string): string | null {
  const text = input.trim();
  try {
    const code = new URL(text).searchParams.get("code");
    if (code) return code;
  } catch {
    /* não é URL: pode ser o código puro */
  }
  return /^TG-[\w-]+$/.test(text) ? text : null;
}

export function createMercadoLivreSource(deps: MercadoLivreDeps): OfferSource {
  const { env, fetchImpl, tokenStore } = deps;
  const source = "mercado-livre";
  let accessToken: { value: string; expires: number } | null = null;

  const required = ["MERCADOLIVRE_CLIENT_ID", "MERCADOLIVRE_CLIENT_SECRET", "MERCADOLIVRE_REFRESH_TOKEN"];
  const configured = () => Boolean(env.MERCADOLIVRE_ACCESS_TOKEN) || required.every((k) => env[k]);

  async function token(): Promise<string> {
    if (env.MERCADOLIVRE_ACCESS_TOKEN) return env.MERCADOLIVRE_ACCESS_TOKEN;
    if (accessToken && accessToken.expires > Date.now() + 60_000) return accessToken.value;
    if (!configured()) throw new IntegrationError("Mercado Livre sem credenciais do aplicativo.", "configuracao");
    const refresh = tokenStore?.get() ?? env.MERCADOLIVRE_REFRESH_TOKEN!;
    const data = await requestJson<{ access_token?: string; refresh_token?: string; expires_in?: number }>(
      `${API}/oauth/token`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({ grant_type: "refresh_token", client_id: env.MERCADOLIVRE_CLIENT_ID!, client_secret: env.MERCADOLIVRE_CLIENT_SECRET!, refresh_token: refresh }),
      },
      { source, retries: 1, fetchImpl },
    );
    if (!data.access_token) throw new IntegrationError("Mercado Livre não devolveu token de acesso.", "api_mudou");
    // O Mercado Livre troca o refresh token a cada uso: guarda o novo.
    if (data.refresh_token && tokenStore) tokenStore.set(data.refresh_token);
    accessToken = { value: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
    return accessToken.value;
  }

  async function get<T>(path: string): Promise<T> {
    const t = await token();
    return requestJson<T>(`${API}${path}`, { headers: { authorization: `Bearer ${t}`, accept: "application/json" } }, { source, minIntervalMs: 250, fetchImpl });
  }

  return {
    id: source,
    label: "Mercado Livre (API oficial)",
    kind: "api",
    terms:
      "Use só os endpoints oficiais liberados para o seu aplicativo e respeite os limites de chamadas. O link de afiliado é gerado no painel do programa de afiliados e cadastrado na oferta.",
    status() {
      if (configured()) return { state: "ativa", missingEnv: [], note: "Aplicativo configurado. Preço, disponibilidade e frete por CEP via API." };
      return { state: "pendente", missingEnv: required.filter((k) => !env[k]), note: "Registre um aplicativo em developers.mercadolivre.com.br e autorize a conta." };
    },
    capabilities() {
      if (!configured()) return NO_CAPABILITIES;
      return { searchListings: false, refreshPrice: true, availability: true, shippingQuote: true, affiliateLink: false };
    },
    parseListingUrl: parseMercadoLivreUrl,

    async fetchListing(externalId: string): Promise<NormalizedListing> {
      if (!/^MLB\d{6,}$/.test(externalId)) throw new IntegrationError(`ID de anúncio inválido: ${externalId}`, "dados");
      const item = await cached(`ml:item:${externalId}`, 10 * 60_000, () => get<MlItem>(`/items/${externalId}`));
      if (!item || typeof item !== "object" || item.id !== externalId || !("status" in item)) {
        throw new IntegrationError("Resposta do Mercado Livre em formato inesperado (a API pode ter mudado).", "api_mudou");
      }
      if (item.price != null && typeof item.price !== "number") throw new IntegrationError("Campo de preço em formato inesperado.", "api_mudou");
      const attr = (id: string) => item.attributes?.find((a) => a.id === id)?.value_name ?? null;
      const active = item.status === "active" && (item.available_quantity ?? 0) > 0;
      return {
        externalId,
        url: item.permalink ?? null,
        title: item.title ?? null,
        price: typeof item.price === "number" && item.price > 0 ? item.price : null,
        currency: item.currency_id ?? "BRL",
        availability: active ? "disponivel" : "indisponivel",
        freeShipping: typeof item.shipping?.free_shipping === "boolean" ? item.shipping.free_shipping : null,
        imageUrl: item.pictures?.[0]?.secure_url ?? (item.thumbnail?.replace(/^http:/, "https:") || null),
        listingWeightGrams: weightFromTitle(attr("NET_WEIGHT") ?? attr("WEIGHT")) ?? weightFromTitle(item.title),
        listingFlavor: attr("FLAVOR"),
        affiliateUrl: null,
        obtainedAt: new Date().toISOString(),
      };
    },

    async quoteShipping(externalId: string, cep: string): Promise<ShippingQuoteResult> {
      const data = await get<{ options?: { cost?: number; list_cost?: number; estimated_delivery_time?: { shipping?: number } }[] }>(
        `/items/${externalId}/shipping_options?zip_code=${cep}`,
      );
      if (!data || !Array.isArray(data.options)) throw new IntegrationError("Cotação de frete em formato inesperado.", "api_mudou");
      const costs = data.options.filter((o) => typeof o.cost === "number");
      if (!costs.length) throw new IntegrationError("Sem opção de envio para este CEP.", "dados");
      const best = costs.reduce((a, b) => (b.cost! < a.cost! ? b : a));
      const hours = best.estimated_delivery_time?.shipping;
      return { cost: best.cost!, currency: "BRL", deadlineDays: typeof hours === "number" ? Math.ceil(hours / 24) : null };
    },
  };
}
