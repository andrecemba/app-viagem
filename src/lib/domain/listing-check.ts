import type { Product, Store } from "./types";
import { hostMatches, hostOf, normalizeText } from "./validation";

/**
 * Conferência rápida de um anúncio novo contra o produto, sem abrir a página da
 * loja: lê o nome que vem no próprio endereço (…/formula-natural-adultos-…/dp/…)
 * e segue o link curto de afiliado até o anúncio de destino.
 * É um alerta, não uma prova: o que o endereço não diz continua para conferir à mão.
 */

export interface CheckLine {
  ok: boolean;
  message: string;
}

/** Texto do caminho do endereço, sem a busca (?keywords=… repetiria o que foi pesquisado). */
export function urlPathText(url: string): string {
  try {
    const path = new URL(url).pathname;
    let decoded = path;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      /* caminho com % solto: usa como veio */
    }
    return decoded.replace(/[/_-]+/g, " ");
  } catch {
    return "";
  }
}

const has = (text: string, re: RegExp) => re.test(text);
const FILHOTE = /\b(filhotes?|puppy|junior)\b/;
const ADULTO = /\b(adultos?|adult)\b/;
const SENIOR = /\b(senior|idosos?|mature)\b/;
const PEQUENO = /\b(mini|pequen[oa]s?|small|toy)\b/;
const GRANDE = /\b(grandes?|gigantes?|medi[oa]s?|large|medium|maxi)\b/;
const FLAVORS = ["frango", "carne", "salmao", "cordeiro", "peixe", "peru", "pato", "atum", "coelho", "vegetais"];

/** Pesos escritos no endereço: "2,5kg", "2-5kg", "2.5 kg", "15kg", "500g". */
function weightsInUrl(raw: string): number[] {
  const text = raw.toLowerCase();
  return [...text.matchAll(/(\d+(?:[.,]\d+| \d(?!\d))?)\s?(kg|g)\b/g)].map((m) => {
    const n = Number(m[1].replace(/[, ]/, "."));
    return Math.round(m[2] === "kg" ? n * 1000 : n);
  });
}

function fmtKg(grams: number) {
  return grams >= 1000 ? `${String(grams / 1000).replace(".", ",")} kg` : `${grams} g`;
}

export function checkUrlText(product: Pick<Product, "brand" | "flavor" | "weightGrams" | "lifeStage" | "size" | "neutered">, url: string): CheckLine[] {
  const raw = urlPathText(url);
  const text = normalizeText(raw);
  // Endereço sem o nome do produto (…/dp/B0…, …/MLB123): nada para comparar.
  if (text.split(" ").filter((w) => /[a-z]{3,}/.test(w)).length < 3) {
    return [{ ok: false, message: "O endereço não traz o nome do produto: confira o título na página da loja." }];
  }
  const out: CheckLine[] = [];

  const stage = product.lifeStage;
  if (stage === "filhote" && !has(text, FILHOTE) && (has(text, ADULTO) || has(text, SENIOR))) {
    out.push({ ok: false, message: `O endereço fala em “${has(text, ADULTO) ? "adulto" : "sênior"}”, mas o produto é para filhote.` });
  } else if (stage === "adulto" && !has(text, ADULTO) && has(text, FILHOTE)) {
    out.push({ ok: false, message: "O endereço fala em “filhote”, mas o produto é para adulto." });
  } else if (stage === "senior" && !has(text, SENIOR) && (has(text, FILHOTE) || has(text, ADULTO))) {
    out.push({ ok: false, message: `O endereço fala em “${has(text, FILHOTE) ? "filhote" : "adulto"}”, mas o produto é sênior.` });
  }

  const small = product.size === "mini" || product.size === "pequeno" || product.size === "mini_pequeno";
  const big = product.size === "medio" || product.size === "grande" || product.size === "medio_grande";
  if (small && has(text, GRANDE) && !has(text, PEQUENO)) out.push({ ok: false, message: "O endereço fala em porte médio/grande, mas o produto é para porte mini/pequeno." });
  if (big && has(text, PEQUENO) && !has(text, GRANDE)) out.push({ ok: false, message: "O endereço fala em porte mini/pequeno, mas o produto é para porte médio/grande." });

  if (!product.neutered && /\bcastrad/.test(text)) out.push({ ok: false, message: "O endereço fala em “castrados”, e o produto não é a versão para castrados." });

  const weights = [...new Set(weightsInUrl(raw))];
  if (weights.length === 1 && weights[0] !== product.weightGrams) {
    // O Mercado Livre tira a vírgula do endereço: "2,5kg" vira "25kg".
    const lostComma = weights[0] === product.weightGrams * 10;
    out.push({
      ok: false,
      message: lostComma
        ? `O endereço diz ${fmtKg(weights[0])}; pode ser ${fmtKg(product.weightGrams)} sem a vírgula. Confira o peso na página.`
        : `O endereço diz ${fmtKg(weights[0])}, mas o produto tem ${fmtKg(product.weightGrams)}.`,
    });
  }

  const productFlavors = FLAVORS.filter((f) => normalizeText(product.flavor).includes(f));
  const urlFlavors = FLAVORS.filter((f) => new RegExp(`\\b${f}`).test(text));
  if (productFlavors.length && urlFlavors.length && !urlFlavors.some((f) => productFlavors.includes(f))) {
    out.push({ ok: false, message: `O endereço fala em ${urlFlavors.join(", ")}, mas o sabor do produto é ${product.flavor}.` });
  }

  const brandWords = normalizeText(product.brand).split(" ").filter((w) => w.length > 2);
  if (brandWords.length && !brandWords.some((w) => text.includes(w))) {
    out.push({ ok: false, message: `O endereço não cita a marca ${product.brand}.` });
  }

  if (!out.length) out.push({ ok: true, message: "Nada no endereço contradiz o produto (marca, idade, porte, peso e sabor)." });
  return out;
}

/** Identificadores de anúncio que aparecem num endereço, para comparar dois links. */
export function listingIds(url: string): string[] {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return [];
  }
  const whole = decodeURIComponentSafe(u.pathname + u.search + u.hash);
  const ids = new Set<string>();
  for (const m of whole.matchAll(/MLB-?(\d{6,})/gi)) ids.add(`MLB${m[1]}`);
  for (const m of whole.matchAll(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/gi)) ids.add(`ASIN:${m[1].toUpperCase()}`);
  for (const m of whole.matchAll(/i\.(\d+)\.(\d+)/g)) ids.add(`SHOPEE:${m[1]}.${m[2]}`);
  for (const m of whole.matchAll(/\/product\/(\d+)\/(\d+)/g)) ids.add(`SHOPEE:${m[1]}.${m[2]}`);
  return [...ids];
}

function decodeURIComponentSafe(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export type AffiliateCheck =
  | { status: "mesmo"; finalUrl: string; tag: string | null }
  | { status: "diferente"; finalUrl: string; tag: string | null }
  | { status: "sem_conferencia"; reason: string };

/**
 * Segue os redirecionamentos do link de afiliado (só dentro dos domínios da loja
 * e do programa de afiliados) e compara o anúncio de destino com o da página.
 */
export async function checkAffiliateLink(
  store: Pick<Store, "domains" | "affiliateDomains">,
  pageUrl: string,
  affiliateUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AffiliateCheck> {
  const allowed = [...store.domains, ...store.affiliateDomains];
  let current = affiliateUrl;
  for (let hop = 0; hop < 6; hop++) {
    const host = hostOf(current);
    if (!host || !hostMatches(host, allowed)) {
      return {
        status: "sem_conferencia",
        reason: hop === 0
          ? `o domínio ${host ?? "do link"} não está cadastrado na loja (Lojas → Editar loja → Domínios extras do link de afiliado).`
          : "o link leva para fora da loja e do programa de afiliados.",
      };
    }
    if (hostMatches(host, store.domains)) break;
    let res: Response;
    try {
      res = await fetchImpl(current, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(6000), headers: { accept: "text/html" } });
    } catch {
      return { status: "sem_conferencia", reason: "não foi possível abrir o link agora (sem conexão ou demorou demais)." };
    }
    const next = res.headers.get("location");
    await res.body?.cancel().catch(() => {});
    if (res.status < 300 || res.status >= 400 || !next) {
      return { status: "sem_conferencia", reason: "o link não indicou para onde leva: abra-o no navegador e confira." };
    }
    current = new URL(next, current).toString();
  }
  const host = hostOf(current);
  if (!host || !hostMatches(host, store.domains)) return { status: "sem_conferencia", reason: "o link não chegou à página da loja." };
  let tag: string | null = null;
  try {
    tag = new URL(current).searchParams.get("tag");
  } catch {
    /* sem etiqueta */
  }
  const a = listingIds(pageUrl);
  const b = listingIds(current);
  if (!a.length || !b.length) return { status: "sem_conferencia", reason: "não achamos o número do anúncio nos links para comparar: abra os dois e confira." };
  return { status: a.some((id) => b.includes(id)) ? "mesmo" : "diferente", finalUrl: current, tag };
}
