import type { Product, Store } from "./types";

/** Erro de validação: a mensagem vai direto para a tela, em português. */
export class ValidationError extends Error {}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  // "N&D" → "nd" (sigla), "Carne & Arroz" → "carne-e-arroz".
  return normalizeText(value.replace(/(\w)&(\w)/g, "$1$2")).replace(/\s+/g, "-");
}

export function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function hostMatches(host: string, domains: string[]) {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/** URL do anúncio: https e de um domínio da loja. */
export function validateListingUrl(store: Pick<Store, "name" | "domains">, url: string) {
  const host = hostOf(url);
  if (!host) throw new ValidationError("A URL do anúncio precisa ser um endereço https:// válido.");
  if (store.domains.length && !hostMatches(host, store.domains)) {
    throw new ValidationError(`A URL não é de ${store.name} (domínio ${host}).`);
  }
}

/** Link de afiliado: https e de um domínio da loja ou do programa de afiliados dela. Nunca derivado da URL comum. */
export function validateAffiliateUrl(store: Pick<Store, "name" | "domains" | "affiliateDomains">, url: string) {
  const host = hostOf(url);
  if (!host) throw new ValidationError("O link de afiliado precisa ser um endereço https:// válido.");
  const allowed = [...store.domains, ...store.affiliateDomains];
  if (allowed.length && !hostMatches(host, allowed)) {
    throw new ValidationError(`O link de afiliado não é de ${store.name} nem do programa de afiliados dela (domínio ${host}).`);
  }
}

/** Loja dona de uma URL, pelo domínio. */
export function storeForUrl<T extends Pick<Store, "domains" | "affiliateDomains">>(stores: T[], url: string): T | null {
  const host = hostOf(url);
  if (!host) return null;
  return stores.find((s) => hostMatches(host, s.domains)) ?? stores.find((s) => hostMatches(host, s.affiliateDomains)) ?? null;
}

/** Lê o peso da embalagem de um título de anúncio: "15kg", "10,1 Kg", "85 g", "2.5kg". */
export function weightFromTitle(title: string | null | undefined): number | null {
  if (!title) return null;
  const matches = [...title.toLowerCase().matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|quilos?|g|gr|gramas)\b/g)];
  if (matches.length !== 1) return null; // nenhum ou vários pesos (kits, "12 x 85 g"): não arrisca
  const n = Number(matches[0][1].replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(matches[0][2].startsWith("k") || matches[0][2].startsWith("q") ? n * 1000 : n);
}

/** O sabor do anúncio corresponde ao do produto? Todas as palavras do sabor do produto precisam aparecer. */
export function flavorMatches(productFlavor: string | null, listingFlavor: string | null): boolean {
  if (!productFlavor || !listingFlavor) return true;
  const words = normalizeText(productFlavor).split(" ").filter((w) => w.length > 2);
  const listing = normalizeText(listingFlavor);
  return words.every((w) => listing.includes(w.replace(/s$/, "")));
}

/** Chave que impede duplicar a mesma ração: outro sabor, peso ou versão castrado = outro produto. */
export function identityKey(p: Pick<Product, "species" | "brand" | "line" | "indication" | "flavor" | "weightGrams" | "neutered">): string {
  return [p.species, p.brand, p.line ?? "", p.indication, p.flavor ?? "", String(p.weightGrams), p.neutered ? "castrado" : ""]
    .map((v) => normalizeText(v))
    .join("|");
}

export function isValidGtin(gtin: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(gtin)) return false;
  const digits = gtin.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** CEP brasileiro: 8 dígitos. */
export function normalizeCep(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

/** O anúncio parece ser de outra ração? (peso ou sabor diferente do produto) */
export function divergence(
  productWeight: number,
  productFlavor: string | null,
  v: { listingWeightGrams: number | null; listingFlavor: string | null },
) {
  return {
    weight: v.listingWeightGrams != null && v.listingWeightGrams !== productWeight,
    flavor: !flavorMatches(productFlavor, v.listingFlavor),
  };
}
