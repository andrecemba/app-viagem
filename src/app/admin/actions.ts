"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { clearLoginFailures, endSession, loginBlocked, registerLoginFailure, requireAdmin, startSession } from "@/lib/admin/auth";
import { checkCredentials, isAdminConfigured } from "@/lib/admin/session";
import { generateDemoEvents } from "@/lib/analytics/demo";
import { removeDemoEvents, writeDemoEvents } from "@/lib/analytics/store";
import { getCatalog } from "@/lib/catalog/public";
import { DOG_SIZE_VALUES, FOOD_TYPE_VALUES, LIFE_STAGE_VALUES, NEEDS } from "@/lib/catalog/vocab";
import { getDb } from "@/lib/db";
import { removeDemo } from "@/lib/db/seed";
import { createOffer, getOffer, manualOffersWithId, revertOverride, setMatchStatus, setOfferActive, setOfferDataSource, updateOffer } from "@/lib/domain/offers";
import { getProduct, saveProduct, setProductActive, type ProductInput } from "@/lib/domain/products";
import { saveSettings } from "@/lib/domain/settings";
import { getStore, listStores, saveStore } from "@/lib/domain/stores";
import { OVERRIDABLE_FIELDS, type Availability, type DataSource, type OfferValues, type OverridableField, type PriceDisplay, type StoreMode } from "@/lib/domain/types";
import { ValidationError } from "@/lib/domain/validation";
import { importCatalogRows, type ImportRowResult, type ListingLookup } from "@/lib/domain/catalog-import";
import { sourceForStore } from "@/lib/integrations";
import { importOffersCsv, parseCsv } from "@/lib/integrations/csv";
import { isXlsx, readXlsxRows } from "@/lib/integrations/xlsx";
import { refreshOffer, syncStore } from "@/lib/integrations/sync";

/* Toda ação: 1) confere a sessão, 2) valida a entrada, 3) grava, 4) volta com aviso ou erro. */

const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const orNull = (v: string) => (v === "" ? null : v);

function back(path: string, params: Record<string, string>): never {
  const url = new URL(path, "http://x");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function safeReturn(value: string, fallback: string) {
  return value.startsWith("/admin") && !value.startsWith("//") ? value : fallback;
}

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

/** Roda uma alteração; erro de validação volta para a tela com a mensagem. */
async function attempt<T>(returnTo: string, fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ValidationError) back(returnTo, { erro: e.message });
    throw e;
  }
}

/** "1.234,56", "189,9" ou "189.90" → número. */
function decimal(raw: string, what: string): number | null {
  if (!raw) return null;
  const n = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  if (!Number.isFinite(n) || n < 0) throw new ValidationError(`${what} inválido: use um número, ex.: 189,90.`);
  return n;
}

function money(raw: string, what: string) {
  const n = decimal(raw, what);
  return n == null ? null : Math.round(n * 100) / 100;
}

/** Peso digitado em kg ("10,1") ou g ("85"), conforme a unidade escolhida. */
function grams(fd: FormData, field: string, unitField: string, what: string) {
  const n = decimal(text(fd, field), what);
  if (n == null) return null;
  return Math.round(n * (text(fd, unitField) === "g" ? 1 : 1000));
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
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

function productInput(fd: FormData): ProductInput {
  const species = oneOf(text(fd, "especie"), ["caes", "gatos"] as const);
  if (!species) throw new ValidationError("Escolha a espécie: cachorro ou gato.");
  const weight = grams(fd, "peso", "pesoUnidade", "Peso");
  if (weight == null) throw new ValidationError("Informe o peso da embalagem.");
  const units = decimal(text(fd, "unidades"), "Quantidade");
  return {
    species,
    brand: text(fd, "marca"),
    line: orNull(text(fd, "linha")),
    indication: text(fd, "indicacao"),
    flavor: orNull(text(fd, "sabor")),
    weightGrams: weight,
    unitCount: units == null ? null : Math.round(units),
    neutered: fd.get("castrado") === "on",
    lifeStage: oneOf(text(fd, "idade"), LIFE_STAGE_VALUES),
    size: oneOf(text(fd, "porte"), DOG_SIZE_VALUES),
    foodType: oneOf(text(fd, "tipo"), FOOD_TYPE_VALUES),
    needs: fd.getAll("necessidades").filter((v): v is (typeof NEEDS)[number] => typeof v === "string" && (NEEDS as string[]).includes(v)),
    gtin: orNull(text(fd, "gtin")),
    imageUrl: orNull(text(fd, "imagem")),
    description: orNull(text(fd, "descricao")),
    sources: text(fd, "fontes")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [url, ...rest] = l.split(/\s+/);
        return { url, note: rest.join(" ") };
      }),
    notes: orNull(text(fd, "observacoes")),
    active: fd.get("ativo") === "on",
  };
}

export async function saveProductAction(formData: FormData) {
  await requireAdmin();
  const idRaw = text(formData, "id");
  const id = idRaw ? Number(idRaw) : null;
  const returnTo = id ? `/admin/produtos/${id}` : "/admin/produtos/novo";
  const product = await attempt(returnTo, () => saveProduct(getDb(), id, productInput(formData)));
  refresh();
  back(`/admin/produtos/${product.id}`, { aviso: id ? "Produto salvo." : "Produto cadastrado. Agora adicione as ofertas das lojas." });
}

export async function setProductsActiveAction(formData: FormData) {
  await requireAdmin();
  const ids = formData.getAll("ids").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const active = text(formData, "ativo") === "1";
  const returnTo = safeReturn(text(formData, "voltar"), "/admin/produtos");
  if (!ids.length) back(returnTo, { erro: "Nenhum produto selecionado." });
  const db = getDb();
  db.transaction(() => ids.forEach((id) => setProductActive(db, id, active)))();
  refresh();
  back(returnTo, { aviso: `${ids.length} produto(s) ${active ? "ativado(s)" : "desativado(s): saíram do site"}.` });
}

// ── Ofertas ────────────────────────────────────────────────────────────

function offerValues(fd: FormData): Partial<OfferValues> & { previousPriceAt?: string | null; externalId?: string | null } {
  const fs = text(fd, "freteGratis");
  const prevAt = text(fd, "precoAnteriorData");
  return {
    url: text(fd, "url"),
    affiliateUrl: orNull(text(fd, "afiliado")),
    price: money(text(fd, "preco"), "Preço"),
    previousPrice: money(text(fd, "precoAnterior"), "Preço anterior"),
    previousPriceAt: prevAt ? new Date(`${prevAt}T12:00:00-03:00`).toISOString() : null,
    availability: (oneOf(text(fd, "disponibilidade"), ["disponivel", "indisponivel", "desconhecida"] as const) ?? "desconhecida") as Availability,
    freeShipping: fs === "sim" ? true : fs === "nao" ? false : null,
    listingWeightGrams: grams(fd, "pesoAnuncio", "pesoAnuncioUnidade", "Peso do anúncio"),
    listingFlavor: orNull(text(fd, "saborAnuncio")),
    imageUrl: orNull(text(fd, "imagem")),
    notes: orNull(text(fd, "observacoes")),
    externalId: orNull(text(fd, "idAnuncio")),
  };
}

export async function createOfferAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const productId = Number(text(formData, "productId"));
  const storeId = text(formData, "loja");
  const returnTo = `/admin/produtos/${productId}/nova-oferta?url=${encodeURIComponent(text(formData, "url"))}&loja=${storeId}`;
  const offer = await attempt(returnTo, () => {
    const db = getDb();
    const product = getProduct(db, productId);
    if (!product) throw new ValidationError("Produto não encontrado.");
    const store = getStore(db, storeId);
    if (!store) throw new ValidationError("Escolha a loja.");
    const v = offerValues(formData);
    const source = (oneOf(text(formData, "origem"), ["manual", "feed", "api"] as const) ?? "manual") as DataSource;
    if (source !== "manual" && store.mode !== source) throw new ValidationError(`${store.name} não está configurada para ofertas por ${source === "api" ? "API" : "arquivo"}.`);
    if (source !== "manual" && !v.externalId) throw new ValidationError("Ofertas importadas precisam do ID do anúncio.");
    if (v.price == null && source === "manual") throw new ValidationError("Informe o preço (ou escolha uma origem automática).");
    // Conferência explícita: o admin confirma que peso e sabor do anúncio são os do produto.
    if (formData.get("confere") === "on") {
      v.listingWeightGrams ??= product.weightGrams;
      v.listingFlavor ??= product.flavor;
    }
    return createOffer(
      db,
      {
        productId,
        storeId,
        dataSource: source,
        externalId: v.externalId ?? null,
        url: v.url!,
        affiliateUrl: v.affiliateUrl ?? null,
        price: v.price ?? null,
        previousPrice: null,
        previousPriceAt: null,
        availability: v.availability ?? "desconhecida",
        freeShipping: v.freeShipping ?? null,
        listingTitle: orNull(text(formData, "tituloAnuncio")),
        listingWeightGrams: v.listingWeightGrams ?? null,
        listingFlavor: v.listingFlavor ?? null,
        imageUrl: v.imageUrl ?? null,
        notes: v.notes ?? null,
        priceSource: source === "manual" ? "manual" : `${source}:${store.adapter}`,
      },
      actor,
    );
  });
  refresh();
  back(`/admin/ofertas/${offer.id}`, {
    aviso: offer.matchStatus === "incerta" ? "Oferta cadastrada, mas marcada para revisão: o peso ou o sabor do anúncio não bate com o produto." : "Oferta cadastrada.",
  });
}

export async function updateOfferAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = Number(text(formData, "id"));
  const returnTo = `/admin/ofertas/${id}`;
  await attempt(returnTo, () => {
    const v = offerValues(formData);
    // Só os campos enviados pelo formulário entram na comparação.
    const changes = Object.fromEntries(Object.entries(v).filter(([k]) => formData.has(FORM_FIELD[k] ?? k))) as typeof v;
    return updateOffer(getDb(), id, changes, actor, orNull(text(formData, "nota")) ?? undefined);
  });
  refresh();
  back(returnTo, { aviso: "Oferta salva. Correções em ofertas importadas ficam valendo até você voltar ao valor automático." });
}

const FORM_FIELD: Record<string, string> = {
  url: "url",
  affiliateUrl: "afiliado",
  price: "preco",
  previousPrice: "precoAnterior",
  previousPriceAt: "precoAnteriorData",
  availability: "disponibilidade",
  freeShipping: "freteGratis",
  listingWeightGrams: "pesoAnuncio",
  listingFlavor: "saborAnuncio",
  imageUrl: "imagem",
  notes: "observacoes",
  externalId: "idAnuncio",
};

/** Ligada ao campo no servidor: `revertOverrideAction.bind(null, "price")`. */
export async function revertOverrideAction(field: OverridableField, formData: FormData) {
  const { actor } = await requireAdmin();
  const id = Number(text(formData, "id"));
  if (!OVERRIDABLE_FIELDS.includes(field)) back(`/admin/ofertas/${id}`, { erro: "Campo inválido." });
  await attempt(`/admin/ofertas/${id}`, () => revertOverride(getDb(), id, field, actor));
  refresh();
  back(`/admin/ofertas/${id}`, { aviso: "O campo voltou ao valor automático." });
}

export async function setMatchAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = Number(text(formData, "id"));
  const status = text(formData, "status") === "confirmada" ? "confirmada" : "incerta";
  setMatchStatus(getDb(), id, status, actor, orNull(text(formData, "nota")) ?? undefined);
  refresh();
  back(`/admin/ofertas/${id}`, { aviso: status === "confirmada" ? "Correspondência confirmada." : "Oferta marcada para revisão." });
}

export async function setOfferActiveAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = Number(text(formData, "id"));
  const active = text(formData, "ativo") === "1";
  setOfferActive(getDb(), id, active, actor);
  refresh();
  back(safeReturn(text(formData, "voltar"), `/admin/ofertas/${id}`), { aviso: active ? "Oferta reativada." : "Oferta desativada: saiu do site." });
}

export async function refreshOfferAction(formData: FormData) {
  await requireAdmin();
  const id = Number(text(formData, "id"));
  const db = getDb();
  if (!getOffer(db, id)) back("/admin/ofertas", { erro: "Oferta não encontrada." });
  const r = await refreshOffer(db, id);
  refresh();
  if (r.skipped) back(`/admin/ofertas/${id}`, { erro: r.skipped });
  back(`/admin/ofertas/${id}`, r.failed ? { erro: "A consulta falhou: veja o histórico. O último preço válido foi mantido." } : { aviso: "Oferta atualizada pela integração." });
}

/** Liga (e já roda) ou desliga a atualização automática pela API de uma oferta. */
export async function setOfferSourceAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = Number(text(formData, "id"));
  const source = text(formData, "origem") === "api" ? "api" : "manual";
  const returnTo = `/admin/ofertas/${id}`;
  const db = getDb();
  await attempt(returnTo, () => setOfferDataSource(db, id, source, actor));
  if (source === "manual") {
    refresh();
    back(returnTo, { aviso: "Oferta voltou para cadastro manual. Os valores atuais foram mantidos." });
  }
  const r = await refreshOffer(db, id);
  refresh();
  if (r.skipped) back(returnTo, { aviso: "Atualização automática ligada.", erro: `Ainda não deu para consultar: ${r.skipped}` });
  back(
    returnTo,
    r.failed
      ? { aviso: "Atualização automática ligada.", erro: "A primeira consulta falhou: veja o histórico abaixo. O preço cadastrado foi mantido." }
      : { aviso: "Atualização automática ligada: preço, disponibilidade e frete grátis vieram do anúncio oficial." },
  );
}

// ── Lojas ──────────────────────────────────────────────────────────────

/** Passa todas as ofertas manuais (com ID do anúncio) da loja para a API e já consulta. */
export async function useApiForStoreAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const storeId = text(formData, "id");
  const db = getDb();
  const offers = manualOffersWithId(db, storeId);
  const ids = await attempt("/admin/lojas", () => offers.map((o) => setOfferDataSource(db, o.id, "api", actor).id));
  const r = ids.length ? await syncStore(db, storeId, { trigger: "manual", offerIds: ids }) : null;
  refresh();
  if (!r) back("/admin/lojas", { aviso: "Nenhuma oferta manual com ID do anúncio nesta loja." });
  if (r.skipped) back("/admin/lojas", { aviso: `${ids.length} oferta(s) com atualização automática ligada.`, erro: `Ainda não deu para consultar: ${r.skipped}` });
  back("/admin/lojas", { aviso: `${ids.length} oferta(s) passaram para a API: ${r.updated} atualizada(s), ${r.failed} com erro (veja Ofertas e alertas).` });
}

export async function saveStoreAction(formData: FormData) {
  await requireAdmin();
  const isNew = text(formData, "novo") === "1";
  const returnTo = "/admin/lojas";
  const list = (k: string) => text(formData, k).split(/[\s,]+/).filter(Boolean);
  const store = await attempt(isNew ? `${returnTo}?nova=1` : `${returnTo}#loja-${text(formData, "id")}`, () =>
    saveStore(
      getDb(),
      {
        id: text(formData, "id") || undefined,
        name: text(formData, "nome"),
        domains: list("dominios"),
        affiliateDomains: list("dominiosAfiliado"),
        mode: (oneOf(text(formData, "modo"), ["manual", "feed", "api"] as const) ?? "manual") as StoreMode,
        adapter: orNull(text(formData, "adaptador")),
        priceDisplay: (text(formData, "exibicao") === "somente_api" ? "somente_api" : "sempre") as PriceDisplay,
        color: text(formData, "cor") || "#6b7280",
        logoUrl: orNull(text(formData, "logo")),
        active: formData.get("ativa") === "on",
      },
      isNew,
    ),
  );
  refresh();
  back(`${returnTo}#loja-${store.id}`, { aviso: isNew ? `Loja ${store.name} cadastrada.` : `Loja ${store.name} salva.` });
}

export async function syncStoreAction(formData: FormData) {
  await requireAdmin();
  const storeId = text(formData, "id");
  const r = await syncStore(getDb(), storeId, { trigger: "manual", force: formData.get("todas") === "on" });
  refresh();
  if (r.skipped) back("/admin/lojas", { erro: r.skipped });
  back("/admin/lojas", { aviso: `${r.checked} consultada(s), ${r.updated} atualizada(s), ${r.failed} com erro.` });
}

export async function importCsvAction(formData: FormData) {
  await requireAdmin();
  const storeId = text(formData, "id");
  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) back("/admin/lojas", { erro: "Escolha um arquivo CSV." });
  if (file.size > 2_000_000) back("/admin/lojas", { erro: "Arquivo grande demais (máximo 2 MB)." });
  const db = getDb();
  const store = getStore(db, storeId);
  if (!store || store.mode !== "feed") back("/admin/lojas", { erro: "Esta loja não está configurada para importação por arquivo." });
  const report = importOffersCsv(db, storeId, await file.text());
  refresh();
  const parts = [`${report.updated} oferta(s) atualizada(s) de ${report.rows} linha(s).`];
  if (report.unknownIds.length) parts.push(`${report.unknownIds.length} ID(s) sem oferta cadastrada (cadastre a oferta no produto certo antes): ${report.unknownIds.slice(0, 5).join(", ")}.`);
  if (report.errors.length) back("/admin/lojas", { aviso: parts.join(" "), erro: report.errors.slice(0, 3).map((e) => `Linha ${e.line}: ${e.message}`).join(" ") });
  back("/admin/lojas", { aviso: parts.join(" ") });
}

export async function saveSettingsAction(formData: FormData) {
  await requireAdmin();
  const returnTo = safeReturn(text(formData, "voltar"), "/admin/lojas");
  await attempt(returnTo, () => {
    const patch: Parameters<typeof saveSettings>[1] = {};
    if (formData.has("prazo")) patch.staleHours = Number(text(formData, "prazo"));
    if (formData.has("validadeFrete")) patch.shippingQuoteHours = Number(text(formData, "validadeFrete"));
    if (formData.has("conversao")) {
      const pct = (k: string, what: string) => {
        const v = decimal(text(formData, k), what);
        return v == null ? null : v / 100;
      };
      patch.conversionRate = pct("conversao", "Conversão");
      patch.commission = Object.fromEntries(listStores(getDb()).map((s) => [s.id, pct(`comissao_${s.id}`, `Comissão de ${s.name}`)]));
    }
    saveSettings(getDb(), patch);
  });
  refresh();
  back(returnTo, { aviso: "Configuração salva." });
}

// ── Dados e demonstração ───────────────────────────────────────────────

export async function demoEventsAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (text(formData, "acao") === "remover") {
    removeDemoEvents(db);
    back("/admin/dados", { aviso: "Acessos de demonstração removidos." });
  }
  writeDemoEvents(db, generateDemoEvents(await getCatalog()));
  back("/admin/dados?fonte=demo", { aviso: "Acessos de demonstração carregados (fictícios)." });
}

export async function removeDemoAction(formData: FormData) {
  await requireAdmin();
  if (formData.get("confirmo") !== "on") back("/admin/produtos", { erro: "Marque a confirmação para remover os exemplos." });
  removeDemo(getDb());
  refresh();
  back("/admin/produtos", { aviso: "Produtos e ofertas de exemplo removidos. O cadastro real continua." });
}

export interface ImportState {
  results?: ImportRowResult[];
  error?: string;
}

/** Planilha de produtos e ofertas: cria o que falta e completa pela API oficial quando a loja tem API ativa. */
export async function importCatalogAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const { actor } = await requireAdmin();
  const file = formData.get("arquivo");
  let rows: Record<string, string>[];
  if (file instanceof File && file.size > 0) {
    if (file.size > 5_000_000) return { error: "Arquivo grande demais (máximo 5 MB)." };
    if (/\.(xls|ods|numbers)$/i.test(file.name)) return { error: "Formato não aceito. No Excel ou Google Planilhas, baixe/salve como .xlsx ou .csv." };
    const data = Buffer.from(await file.arrayBuffer());
    try {
      rows = isXlsx(data) ? readXlsxRows(data) : parseCsv(data.toString("utf8"));
    } catch (e) {
      return { error: `Não consegui ler a planilha (${e instanceof Error ? e.message : "formato desconhecido"}). Salve de novo como .xlsx ou .csv.` };
    }
  } else {
    const pasted = text(formData, "texto");
    if (!pasted.trim()) return { error: "Escolha o arquivo (.xlsx ou .csv) ou cole o conteúdo." };
    // Colado do Excel/Planilhas vem separado por tabulação.
    rows = parseCsv(pasted.includes("\t") ? pasted.replace(/\t/g, ";") : pasted);
  }
  const db = getDb();
  const lookup: ListingLookup = async (store, externalId, url) => {
    const src = sourceForStore(store, db);
    if (store.mode !== "api" || !src.fetchListing || src.status().state !== "ativa") return null;
    return src.fetchListing(externalId, { url });
  };
  try {
    const results = await importCatalogRows(db, rows, actor, lookup);
    refresh();
    return { results };
  } catch (e) {
    if (e instanceof ValidationError) return { error: e.message };
    throw e;
  }
}
