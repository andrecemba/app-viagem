import { ADMIN_STORES, storeInfo } from "@/config/stores";
import { NEEDS } from "@/lib/catalog/vocab";

import { slugify } from "./text";
import type { AdminDb, AdminOffer, AdminProduct, AdminSettings, PublicationStatus } from "./types";

/** Erro de validação: a mensagem vai direto para a tela. */
export class AdminError extends Error {}

const HISTORY_DAYS = 90;

// ── Produto ────────────────────────────────────────────────────────────

/** Campos editáveis no formulário por tópicos. */
export type ProductInput = Pick<
  AdminProduct,
  | "brand"
  | "line"
  | "formula"
  | "flavor"
  | "species"
  | "lifeStage"
  | "size"
  | "foodType"
  | "vetNote"
  | "weightGrams"
  | "unitCount"
  | "needs"
  | "kibbleSize"
  | "description"
  | "gtin"
  | "sku"
  | "imageUrl"
  | "sources"
  | "note"
  | "verified"
>;

/** Campos obrigatórios para publicar (o resto pode ficar "Pendente de verificação"). */
const REQUIRED: { key: keyof ProductInput; label: string }[] = [
  { key: "brand", label: "marca" },
  { key: "formula", label: "fórmula" },
  { key: "species", label: "espécie" },
  { key: "lifeStage", label: "idade" },
  { key: "foodType", label: "tipo" },
  { key: "weightGrams", label: "peso" },
];

export function missingForPublish(p: ProductInput): string[] {
  return REQUIRED.filter(({ key }) => p[key] == null || p[key] === "").map((r) => r.label);
}

/** Tópicos vazios (mostrados como "Pendente de verificação"). */
export function pendingFields(p: AdminProduct): string[] {
  const checks: [unknown, string][] = [
    [p.brand, "Marca"],
    [p.formula, "Fórmula"],
    [p.flavor, "Sabor"],
    [p.species, "Espécie"],
    [p.lifeStage, "Idade"],
    [p.species === "gatos" ? "n/a" : p.size, "Porte"],
    [p.foodType, "Tipo"],
    [p.weightGrams, "Peso"],
    [p.kibbleSize, "Tamanho do grão"],
    [p.description, "Descrição"],
    [p.gtin, "Código de barras"],
    [p.imageUrl, "Foto"],
  ];
  return checks.filter(([v]) => v == null || v === "").map(([, label]) => label);
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validateProduct(input: ProductInput) {
  if (input.weightGrams != null && (!Number.isFinite(input.weightGrams) || input.weightGrams <= 0 || input.weightGrams > 50000)) {
    throw new AdminError("Peso inválido: informe um valor entre 1 g e 50 kg.");
  }
  if (input.unitCount != null && (!Number.isInteger(input.unitCount) || input.unitCount < 1 || input.unitCount > 200)) {
    throw new AdminError("Quantidade de unidades inválida.");
  }
  if (input.gtin && !/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(input.gtin)) {
    throw new AdminError("Código de barras (GTIN/EAN) deve ter 8, 12, 13 ou 14 dígitos.");
  }
  if (input.imageUrl && !isHttpsUrl(input.imageUrl)) throw new AdminError("A foto precisa ser um endereço https://.");
  for (const s of input.sources) if (!isHttpsUrl(s.url)) throw new AdminError(`Fonte inválida (use https://): ${s.url}`);
  if (input.needs.some((n) => !NEEDS.includes(n))) throw new AdminError("Indicação desconhecida.");
  if (input.species === "gatos" && input.size) input.size = null;
}

function uniqueSlug(db: AdminDb, input: ProductInput, selfId: string | null) {
  const base =
    slugify([input.brand, input.line !== input.brand ? input.line : null, input.formula, input.flavor, input.weightGrams ? `${input.weightGrams}g` : null].filter(Boolean).join(" ")) ||
    "produto";
  let slug = base;
  for (let i = 2; db.products.some((p) => p.slug === slug && p.id !== selfId); i++) slug = `${base}-${i}`;
  return slug;
}

export function saveProduct(db: AdminDb, id: string | null, input: ProductInput, actor: string, now: string): { db: AdminDb; id: string } {
  validateProduct(input);
  if (!id) {
    const newId = `prd-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const product: AdminProduct = {
      ...input,
      id: newId,
      slug: uniqueSlug(db, input, null),
      status: "rascunho",
      offers: [],
      createdAt: now,
      updatedAt: now,
      updatedBy: actor,
    };
    return { db: { ...db, products: [product, ...db.products] }, id: newId };
  }
  const current = db.products.find((p) => p.id === id);
  if (!current) throw new AdminError("Produto não encontrado.");
  if (current.status === "publicado") {
    const missing = missingForPublish(input);
    if (missing.length) throw new AdminError(`Produto publicado não pode ficar sem: ${missing.join(", ")}. Volte para rascunho antes de apagar esses dados.`);
  }
  const updated: AdminProduct = { ...current, ...input, slug: current.slug, updatedAt: now, updatedBy: actor };
  return { db: { ...db, products: db.products.map((p) => (p.id === id ? updated : p)) }, id };
}

export function setProductsStatus(db: AdminDb, ids: string[], status: PublicationStatus, actor: string, now: string) {
  const blocked: { id: string; missing: string[] }[] = [];
  const products = db.products.map((p) => {
    if (!ids.includes(p.id) || p.status === status) return p;
    if (status === "publicado") {
      const missing = missingForPublish(p);
      if (missing.length) {
        blocked.push({ id: p.id, missing });
        return p;
      }
    }
    return { ...p, status, updatedAt: now, updatedBy: actor };
  });
  return { db: { ...db, products }, blocked };
}

export function deleteProduct(db: AdminDb, id: string): AdminDb {
  const p = db.products.find((x) => x.id === id);
  if (!p) throw new AdminError("Produto não encontrado.");
  if (p.status === "publicado") throw new AdminError("Tire o produto do ar (rascunho ou oculto) antes de excluir.");
  return { ...db, products: db.products.filter((x) => x.id !== id) };
}

// ── Preços nas lojas ───────────────────────────────────────────────────

export interface OfferInput {
  store: string;
  price: number | null;
  url: string | null;
  sellerName: string | null;
  available: boolean;
}

export function validateOfferUrl(store: string, url: string) {
  if (!isHttpsUrl(url)) throw new AdminError("O link precisa começar com https://.");
  const host = new URL(url).hostname.replace(/^www\./, "");
  const { domains, name } = storeInfo(store);
  if (domains.length && !domains.some((d) => host === d || host.endsWith(`.${d}`))) {
    throw new AdminError(`O link não é de ${name} (domínio ${host}). Confira se colou o link da loja certa.`);
  }
}

export function saveOffer(db: AdminDb, productId: string, offerId: string | null, input: OfferInput, now: string): AdminDb {
  const product = db.products.find((p) => p.id === productId);
  if (!product) throw new AdminError("Produto não encontrado.");
  if (!ADMIN_STORES.some((s) => s.slug === input.store)) throw new AdminError("Escolha uma loja da lista.");
  if (input.price != null && (!Number.isFinite(input.price) || input.price <= 0 || input.price > 20000)) {
    throw new AdminError("Preço inválido.");
  }
  if (input.url) validateOfferUrl(input.store, input.url);
  if (product.offers.some((o) => o.store === input.store && o.id !== offerId)) {
    throw new AdminError(`${storeInfo(input.store).name} já tem um preço neste produto. Edite o existente.`);
  }

  const cutoff = new Date(new Date(now).getTime() - HISTORY_DAYS * 86400_000).toISOString();
  const withHistory = (history: AdminOffer["history"], price: number | null) => {
    const kept = history.filter((h) => h.at >= cutoff);
    return price != null && kept.at(-1)?.price !== price ? [...kept, { at: now, price }] : kept;
  };

  let offers: AdminOffer[];
  if (offerId) {
    const current = product.offers.find((o) => o.id === offerId);
    if (!current) throw new AdminError("Preço não encontrado.");
    offers = product.offers.map((o) => (o.id === offerId ? { ...o, ...input, updatedAt: now, history: withHistory(o.history, input.price) } : o));
  } else {
    const offer: AdminOffer = {
      id: `ofr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...input,
      updatedAt: now,
      history: withHistory([], input.price),
    };
    offers = [...product.offers, offer];
  }
  return { ...db, products: db.products.map((p) => (p.id === productId ? { ...p, offers, updatedAt: now } : p)) };
}

export function deleteOffer(db: AdminDb, productId: string, offerId: string, now: string): AdminDb {
  return {
    ...db,
    products: db.products.map((p) => (p.id === productId ? { ...p, offers: p.offers.filter((o) => o.id !== offerId), updatedAt: now } : p)),
  };
}

// ── Configuração dos relatórios ────────────────────────────────────────

export function saveSettings(db: AdminDb, settings: AdminSettings): AdminDb {
  const bad = (v: number | null) => v != null && (!Number.isFinite(v) || v < 0 || v > 1);
  if (bad(settings.conversionRate)) throw new AdminError("Conversão deve ficar entre 0% e 100%.");
  for (const [store, v] of Object.entries(settings.commission)) {
    if (bad(v)) throw new AdminError(`Comissão de ${storeInfo(store).name} deve ficar entre 0% e 100%.`);
  }
  return { ...db, settings };
}
