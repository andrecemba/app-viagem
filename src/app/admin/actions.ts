"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { clearLoginFailures, endSession, loginBlocked, registerLoginFailure, requireAdmin, startSession } from "@/lib/admin/auth";
import { runChecks } from "@/lib/admin/checks";
import { loadDemoData, removeDemoData } from "@/lib/admin/demo";
import { FIELD_LABEL } from "@/lib/admin/labels";
import {
  AdminError,
  createOffer,
  createProduct,
  editOfferField,
  editProductField,
  ignoreAlert,
  importProductValues,
  offerFieldAction,
  productFieldAction,
  relinkOffer,
  reopenAlert,
  setOfferEligibility,
  setOfferHidden,
  setProductsStatus,
  updateProductMeta,
  updateStoreRules,
  type ProductInput,
} from "@/lib/admin/mutations";
import { adminRepo } from "@/lib/admin/repository";
import { checkCredentials, isAdminConfigured } from "@/lib/admin/session";
import type { AdminDb, Availability, OfferFieldKey, ProductFieldKey, ProductFields, PublicationStatus } from "@/lib/admin/types";

/* Toda ação: 1) confere a sessão, 2) valida a entrada, 3) grava, 4) volta com aviso. */

const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};

function back(path: string, params: Record<string, string>): never {
  const url = new URL(path, "http://x");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function safeReturn(value: string, fallback: string) {
  return value.startsWith("/admin") && !value.startsWith("//") ? value : fallback;
}

async function mutate(returnTo: string, fn: (db: AdminDb) => AdminDb | Promise<AdminDb>, ok: string) {
  try {
    await adminRepo.update(fn);
  } catch (e) {
    if (e instanceof AdminError) back(returnTo, { erro: e.message });
    throw e;
  }
  revalidatePath("/admin", "layout");
  back(returnTo, { aviso: ok });
}

// ── Sessão ─────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const voltar = safeReturn(text(formData, "voltar"), "/admin");
  if (!isAdminConfigured()) back("/admin/entrar", { erro: "Acesso administrativo não configurado no servidor." });
  if (loginBlocked(ip)) back("/admin/entrar", { erro: "Muitas tentativas. Aguarde 15 minutos." });
  const email = text(formData, "email");
  if (!checkCredentials(email, typeof formData.get("senha") === "string" ? (formData.get("senha") as string) : "")) {
    registerLoginFailure(ip);
    back("/admin/entrar", { erro: "E-mail ou senha incorretos.", voltar });
  }
  clearLoginFailures(ip);
  await startSession(email.toLowerCase());
  redirect(voltar);
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/entrar");
}

// ── Produtos ───────────────────────────────────────────────────────────

const PRODUCT_KEYS = Object.keys(FIELD_LABEL) as ProductFieldKey[];

function parseProductValue(key: ProductFieldKey, raw: string): ProductFields[ProductFieldKey]["value"] {
  if (raw === "") return null;
  if (key === "weightGrams") {
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) throw new AdminError("Peso deve ser um número inteiro de gramas maior que zero.");
    return n;
  }
  if (key === "imageUrl" && !/^https:\/\//.test(raw)) throw new AdminError("A imagem precisa de um endereço https.");
  if (key === "gtin" && !/^\d{8}$|^\d{12,14}$/.test(raw)) throw new AdminError("GTIN/EAN deve ter 8, 12, 13 ou 14 dígitos.");
  return raw;
}

export async function createProductAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const input: ProductInput = {};
  let newId = "";
  try {
    for (const key of PRODUCT_KEYS) {
      const raw = text(formData, key);
      if (raw) (input as Record<string, unknown>)[key] = parseProductValue(key, raw);
    }
    if (!input.brand || !input.formula || !input.species) throw new AdminError("Informe pelo menos marca, fórmula e espécie.");
    const source = text(formData, "fonte");
    if (source && !/^https?:\/\//.test(source)) throw new AdminError("A fonte precisa ser um endereço http(s).");
    await adminRepo.update((db) => {
      const r = createProduct(db, input, source || null, actor, new Date());
      newId = r.id;
      return r.db;
    });
  } catch (e) {
    if (e instanceof AdminError) back("/admin/produtos/novo", { erro: e.message });
    throw e;
  }
  revalidatePath("/admin", "layout");
  back(`/admin/produtos/${newId}`, { aviso: "Ficha criada como rascunho." });
}

export async function editProductFieldAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "id");
  const key = text(formData, "campo") as ProductFieldKey;
  const returnTo = `/admin/produtos/${id}#campo-${key}`;
  if (!PRODUCT_KEYS.includes(key)) back(returnTo, { erro: "Campo inválido." });
  const reviewAt = text(formData, "revisarEm");
  await mutate(
    returnTo,
    (db) =>
      editProductField(db, id, key, parseProductValue(key, text(formData, "valor")), {
        lock: formData.get("travar") === "on",
        reviewAt: reviewAt ? new Date(`${reviewAt}T09:00:00-03:00`).toISOString() : null,
        note: text(formData, "nota") || undefined,
        verified: formData.get("verificado") === "on",
      }, actor, new Date()),
    `${FIELD_LABEL[key]}: correção salva.`,
  );
}

export async function productFieldCommandAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "id");
  const key = text(formData, "campo") as ProductFieldKey;
  const command = text(formData, "comando") as "lock" | "unlock" | "accept_auto" | "clear_review";
  await mutate(`/admin/produtos/${id}#campo-${key}`, (db) => productFieldAction(db, id, key, command, actor, new Date()), "Campo atualizado.");
}

export async function setStatusAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const ids = formData.getAll("ids").filter((v): v is string => typeof v === "string");
  const status = text(formData, "estado") as PublicationStatus;
  const returnTo = safeReturn(text(formData, "voltar"), "/admin/produtos");
  if (!ids.length) back(returnTo, { erro: "Selecione ao menos um produto." });
  if (!["rascunho", "publicado", "oculto"].includes(status)) back(returnTo, { erro: "Estado inválido." });
  let blocked: { label: string; missing: string[] }[] = [];
  await adminRepo.update((db) => {
    const r = setProductsStatus(db, ids, status, actor, new Date());
    blocked = r.blocked;
    return r.db;
  });
  revalidatePath("/admin", "layout");
  if (blocked.length) {
    back(returnTo, {
      erro: `Não publicado por falta de dados: ${blocked.map((b) => `${b.label} (${b.missing.join(", ")})`).join("; ")}.`,
      ...(ids.length > blocked.length ? { aviso: `${ids.length - blocked.length} produto(s) atualizados.` } : {}),
    });
  }
  back(returnTo, { aviso: `${ids.length} produto(s) marcados como ${status}.` });
}

export async function productMetaAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "id");
  const url = text(formData, "fonteUrl");
  if (url && !/^https?:\/\//.test(url)) back(`/admin/produtos/${id}#fontes`, { erro: "A fonte precisa ser um endereço http(s)." });
  await mutate(
    `/admin/produtos/${id}#fontes`,
    (db) =>
      updateProductMeta(db, id, {
        verificationNote: formData.has("nota") ? text(formData, "nota") : undefined,
        addSource: url ? { url, evidence: text(formData, "fonteEvidencia") || "Sem descrição" } : undefined,
      }, actor, new Date()),
    "Ficha atualizada.",
  );
}

/** Só no modo de demonstração: simula uma importação com valores diferentes, para ver a revisão de diferenças. */
export async function simulateImportAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "id");
  await mutate(
    `/admin/produtos/${id}#campos`,
    async (db) => {
      if (!db.settings.demoMode) throw new AdminError("Disponível só no modo de demonstração.");
      const p = db.products.find((x) => x.id === id);
      if (!p) throw new AdminError("Produto não encontrado.");
      const w = p.fields.weightGrams.value;
      return importProductValues(db, id, {
        flavor: p.fields.flavor.value === "Frango" ? "Frango e Arroz" : "Frango",
        weightGrams: w ? (w >= 10000 ? w - 100 : w + 500) : 1000,
        description: "Descrição recebida da importação de demonstração (texto fictício).",
      }, "importação de demonstração", actor, new Date());
    },
    "Importação de demonstração aplicada. Campos sensíveis ficaram aguardando revisão.",
  );
}

// ── Ofertas ────────────────────────────────────────────────────────────

function parsePrice(raw: string) {
  if (!raw) return null;
  // "1.234,56" (formato brasileiro) ou "189.9" (valor já salvo).
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) throw new AdminError("Preço inválido: use um valor maior que zero, ex.: 189,90.");
  return Math.round(n * 100) / 100;
}

export async function createOfferAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const productId = text(formData, "productId");
  const returnTo = `/admin/produtos/${productId}#ofertas`;
  await mutate(
    returnTo,
    (db) =>
      createOffer(db, {
        productId,
        storeId: text(formData, "storeId"),
        externalId: text(formData, "externalId"),
        price: parsePrice(text(formData, "price")),
        availability: (text(formData, "availability") || "disponivel") as Availability,
        url: text(formData, "url") || null,
        affiliateUrl: text(formData, "affiliateUrl") || null,
        sellerName: text(formData, "sellerName") || null,
        listingTitle: text(formData, "listingTitle") || null,
        commissionEligibility: (text(formData, "eligibility") || "nao_confirmada") as "confirmada" | "nao_confirmada" | "sem_programa",
      }, actor, new Date()).db,
    "Oferta cadastrada.",
  );
}

const OFFER_KEYS: OfferFieldKey[] = ["price", "availability", "url", "affiliateUrl", "sellerName", "listingTitle", "variationLabel"];

export async function editOfferFieldAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "id");
  const key = text(formData, "campo") as OfferFieldKey;
  const returnTo = safeReturn(text(formData, "voltar"), `/admin/ofertas/${id}`);
  if (!OFFER_KEYS.includes(key)) back(returnTo, { erro: "Campo inválido." });
  const raw = text(formData, "valor");
  const reviewAt = text(formData, "revisarEm");
  await mutate(
    returnTo,
    (db) => {
      const value = key === "price" ? parsePrice(raw) : raw || null;
      if ((key === "url" || key === "affiliateUrl") && value && !/^https:\/\//.test(value as string)) {
        throw new AdminError("Use um endereço https completo.");
      }
      return editOfferField(db, id, key, value as never, {
        lock: formData.get("travar") === "on",
        reviewAt: reviewAt ? new Date(`${reviewAt}T09:00:00-03:00`).toISOString() : null,
        note: text(formData, "nota") || undefined,
      }, actor, new Date());
    },
    "Oferta atualizada.",
  );
}

export async function offerFieldCommandAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "id");
  const key = text(formData, "campo") as OfferFieldKey;
  await mutate(`/admin/ofertas/${id}`, (db) => offerFieldAction(db, id, key, text(formData, "comando") as "lock" | "unlock" | "accept_auto" | "clear_review", actor, new Date()), "Campo atualizado.");
}

export async function hideOfferAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "id");
  const hide = text(formData, "ocultar") === "1";
  const returnTo = safeReturn(text(formData, "voltar"), `/admin/ofertas/${id}`);
  await mutate(returnTo, (db) => setOfferHidden(db, id, hide, text(formData, "motivo"), actor, new Date()), hide ? "Oferta ocultada." : "Oferta visível novamente.");
}

export async function eligibilityAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "id");
  const value = text(formData, "elegibilidade") as "confirmada" | "nao_confirmada" | "sem_programa";
  await mutate(`/admin/ofertas/${id}`, (db) => setOfferEligibility(db, id, value, actor, new Date()), "Elegibilidade atualizada.");
}

export async function relinkOfferAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "id");
  const productId = text(formData, "productId");
  if (formData.get("confirmo") !== "on") back(`/admin/ofertas/${id}`, { erro: "Confirme que conferiu as diferenças antes de trocar o produto.", destino: productId });
  await mutate(`/admin/ofertas/${id}`, (db) => relinkOffer(db, id, productId, actor, new Date()), "Produto vinculado alterado.");
}

export async function checkNowAction(formData: FormData) {
  await requireAdmin();
  const ids = formData.getAll("ids").filter((v): v is string => typeof v === "string");
  const returnTo = safeReturn(text(formData, "voltar"), "/admin/ofertas");
  let summary = "";
  await adminRepo.update(async (db) => {
    const { db: next, run } = await runChecks(db, { trigger: ids.length ? "oferta" : "manual", offerIds: ids.length ? ids : undefined });
    const t = run.stores.reduce((acc, s) => ({ c: acc.c + s.consulted, u: acc.u + s.updated, e: acc.e + s.errors, s: acc.s + s.skipped }), { c: 0, u: 0, e: 0, s: 0 });
    summary = `Execução concluída: ${t.c} consultada(s), ${t.u} atualizada(s), ${t.e} com erro, ${t.s} sem integração configurada.`;
    return next;
  });
  revalidatePath("/admin", "layout");
  back(returnTo, { aviso: summary });
}

// ── Alertas ────────────────────────────────────────────────────────────

export async function ignoreAlertAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const returnTo = safeReturn(text(formData, "voltar"), "/admin/revisao");
  await mutate(returnTo, (db) => ignoreAlert(db, text(formData, "id"), text(formData, "justificativa"), actor, new Date()), "Alerta ignorado com justificativa.");
}

export async function reopenAlertAction(formData: FormData) {
  await requireAdmin();
  const returnTo = safeReturn(text(formData, "voltar"), "/admin/revisao");
  await mutate(returnTo, (db) => reopenAlert(db, text(formData, "id")), "Alerta reaberto.");
}

// ── Lojas e demonstração ───────────────────────────────────────────────

export async function storeRulesAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const hide = text(formData, "ocultarApos");
  await mutate(
    "/admin/lojas",
    (db) =>
      updateStoreRules(db, text(formData, "id"), {
        frequencyHours: Number(text(formData, "frequencia")),
        staleAfterHours: Number(text(formData, "desatualizada")),
        hideStaleAfterHours: hide ? Number(hide) : null,
      }, actor, new Date()),
    "Regras da loja salvas.",
  );
}

export async function demoModeAction(formData: FormData) {
  await requireAdmin();
  const on = text(formData, "ligar") === "1";
  await mutate("/admin", (db) => (on ? loadDemoData(db) : removeDemoData(db)), on ? "Dados de demonstração carregados (fictícios)." : "Dados de demonstração removidos.");
}
