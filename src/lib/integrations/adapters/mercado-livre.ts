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

interface MlProduct {
  id?: string;
  name?: string;
  pictures?: { url?: string }[];
  attributes?: { id: string; value_name?: string | null }[];
}

interface MlCatalogOffer {
  item_id?: string;
  price?: number | null;
  currency_id?: string;
  shipping?: { free_shipping?: boolean };
}

/** ID da página de catálogo (/p/MLB…) de um link do Mercado Livre. */
export function catalogIdFromUrl(url: string | null | undefined): string | null {
  return url?.match(/\/p\/(MLB\d+)/i)?.[1]?.toUpperCase() ?? null;
}

export function parseMercadoLivreUrl(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { externalId: null, hint: "URL inválida." };
  }
  // Página de catálogo às vezes traz o anúncio escolhido: ?wid=MLB..., ?item_id=MLB... ou pdp_filters=item_id:MLB...
  // Links do programa de afiliados trazem o wid depois do # (…#polycard_client=affiliates&wid=MLB…).
  const hash = new URLSearchParams(u.hash.replace(/^#/, ""));
  const fromQuery =
    u.searchParams.get("wid") ?? u.searchParams.get("item_id") ?? u.searchParams.get("pdp_filters")?.match(/item_id:(MLB\d+)/i)?.[1] ?? hash.get("wid") ?? null;
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
  // "?code=TG-…" (copiado do DevTools) ou só o código, com ou sem o "TG-" na frente.
  const bare = text.replace(/^[?&]?code=/i, "");
  if (/^TG-[\w-]+$/i.test(bare)) return `TG-${bare.slice(3)}`;
  if (/^[0-9a-f]{20,}-\d+$/i.test(bare)) return `TG-${bare}`;
  return null;
}

/** Fonte do Mercado Livre com acesso de leitura bruto, usado só no diagnóstico (npm run ml:testar). */
export type MercadoLivreSource = OfferSource & { rawGet<T>(path: string): Promise<T> };

export function createMercadoLivreSource(deps: MercadoLivreDeps): MercadoLivreSource {
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

  /**
   * GET /products/{catálogo} (nome, fotos, atributos) + GET /products/{catálogo}/items
   * (ofertas ativas de cada vendedor, com preço e frete grátis). null = o anúncio não está na lista.
   */
  async function fromCatalog(externalId: string, catalogId: string): Promise<NormalizedListing | null> {
    const [product, offers] = await Promise.all([
      cached(`ml:product:${catalogId}`, 10 * 60_000, () => get<MlProduct>(`/products/${catalogId}`)),
      cached(`ml:product-items:${catalogId}`, 10 * 60_000, () => get<{ results?: MlCatalogOffer[] }>(`/products/${catalogId}/items`)),
    ]);
    if (!offers || typeof offers !== "object" || !Array.isArray(offers.results)) {
      throw new IntegrationError("Lista de ofertas do catálogo em formato inesperado (a API pode ter mudado).", "api_mudou");
    }
    const hit = offers.results.find((o) => o.item_id === externalId);
    if (!hit) return null;
    if (hit.price != null && typeof hit.price !== "number") throw new IntegrationError("Campo de preço em formato inesperado.", "api_mudou");
    const attr = (id: string) => product?.attributes?.find((a) => a.id === id)?.value_name ?? null;
    return {
      externalId,
      url: null,
      title: product?.name ?? null,
      price: typeof hit.price === "number" && hit.price > 0 ? hit.price : null,
      currency: hit.currency_id ?? "BRL",
      // A lista do catálogo traz só ofertas ativas: estar nela é estar à venda.
      availability: "disponivel",
      freeShipping: typeof hit.shipping?.free_shipping === "boolean" ? hit.shipping.free_shipping : null,
      imageUrl: product?.pictures?.[0]?.url?.replace(/^http:/, "https:") ?? null,
      listingWeightGrams: weightFromTitle(attr("NET_WEIGHT") ?? attr("WEIGHT")) ?? weightFromTitle(product?.name),
      listingFlavor: attr("FLAVOR"),
      affiliateUrl: null,
      obtainedAt: new Date().toISOString(),
      via: "catalogo",
    };
  }

  return {
    rawGet: get,
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

    async fetchListing(externalId: string, ctx?: { url?: string | null }): Promise<NormalizedListing> {
      if (!/^MLB\d{6,}$/.test(externalId)) throw new IntegrationError(`ID de anúncio inválido: ${externalId}`, "dados");
      let item: MlItem;
      try {
        item = await cached(`ml:item:${externalId}`, 10 * 60_000, () => get<MlItem>(`/items/${externalId}`));
      } catch (e) {
        // Anúncio de outro vendedor pode ser recusado (403). Se o link é de uma página de
        // catálogo, procura o mesmo anúncio na lista oficial de ofertas desse catálogo.
        const catalogId = catalogIdFromUrl(ctx?.url);
        if (!(e instanceof IntegrationError) || e.kind !== "permissao" || !catalogId) throw e;
        const viaCatalog = await fromCatalog(externalId, catalogId);
        if (!viaCatalog) {
          throw new IntegrationError(
            `O anúncio ${externalId} não foi liberado para o aplicativo e não aparece entre as ofertas da página de catálogo ${catalogId}.`,
            "nao_encontrado",
          );
        }
        return viaCatalog;
      }
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
        via: "anuncio",
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
