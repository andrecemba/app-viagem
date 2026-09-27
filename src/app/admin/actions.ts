"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { ADMIN_STORES } from "@/config/stores";
import { generateDemoEvents } from "@/lib/analytics/demo";
import { removeDemoEvents, writeDemoEvents } from "@/lib/analytics/store";
import { clearLoginFailures, endSession, loginBlocked, registerLoginFailure, requireAdmin, startSession } from "@/lib/admin/auth";
import { productLabel } from "@/lib/admin/labels";
import {
  AdminError,
  deleteOffer,
  deleteProduct,
  saveOffer,
  saveProduct,
  saveSettings,
  setProductsStatus,
  type ProductInput,
} from "@/lib/admin/mutations";
import { adminRepo } from "@/lib/admin/repository";
import { checkCredentials, isAdminConfigured } from "@/lib/admin/session";
import type { AdminDb, DogSize, FoodType, LifeStage, Need, PublicationStatus, Species } from "@/lib/admin/types";
import { DOG_SIZE_VALUES, FOOD_TYPE_VALUES, LIFE_STAGE_VALUES, NEEDS } from "@/lib/catalog/vocab";
import { mockSource } from "@/lib/data/mock-source";

/* Toda ação: 1) confere a sessão, 2) valida a entrada, 3) grava, 4) volta com aviso. */

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

async function mutate(returnTo: string, fn: (db: AdminDb) => AdminDb | Promise<AdminDb>, ok: string) {
  try {
    await adminRepo.update(fn);
  } catch (e) {
    if (e instanceof AdminError) back(returnTo, { erro: e.message });
    throw e;
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  back(returnTo, { aviso: ok });
}

/** "1.234,56", "189,9" ou "189.90" → número. */
function parseDecimal(raw: string, what: string): number | null {
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) throw new AdminError(`${what} inválido: use um número, ex.: 189,90.`);
  return n;
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

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function productInput(fd: FormData): ProductInput {
  const weight = parseDecimal(text(fd, "peso"), "Peso");
  const unit = text(fd, "pesoUnidade") === "g" ? 1 : 1000;
  const units = parseDecimal(text(fd, "unidades"), "Quantidade");
  const sources = text(fd, "fontes")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [url, ...rest] = line.split(/\s+/);
      return { url, note: rest.join(" ").replace(/^[-–·]\s*/, "") };
    });
  return {
    brand: orNull(text(fd, "marca")),
    line: orNull(text(fd, "linha")),
    formula: orNull(text(fd, "formula")),
    flavor: orNull(text(fd, "sabor")),
    species: oneOf<Species>(text(fd, "especie"), ["caes", "gatos"]),
    lifeStage: oneOf<LifeStage>(text(fd, "idade"), LIFE_STAGE_VALUES),
    size: oneOf<DogSize>(text(fd, "porte"), DOG_SIZE_VALUES),
    foodType: oneOf<FoodType>(text(fd, "tipo"), FOOD_TYPE_VALUES),
    vetNote: orNull(text(fd, "indicacaoVet")),
    weightGrams: weight == null ? null : Math.round(weight * unit),
    unitCount: units == null ? null : Math.round(units),
    needs: fd.getAll("necessidades").filter((v): v is Need => typeof v === "string" && (NEEDS as string[]).includes(v)),
    kibbleSize: orNull(text(fd, "grao")),
    description: orNull(text(fd, "descricao")),
    gtin: orNull(text(fd, "gtin").replace(/\s/g, "")),
    sku: orNull(text(fd, "sku")),
    imageUrl: orNull(text(fd, "foto")),
    sources,
    note: text(fd, "nota"),
    verified: fd.get("conferido") === "on",
  };
}

export async function saveProductAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const id = text(formData, "id") || null;
  const returnTo = id ? `/admin/produtos/${id}` : "/admin/produtos/novo";
  let savedId = id;
  try {
    const input = productInput(formData);
    if (!id && !input.brand && !input.formula) throw new AdminError("Informe pelo menos a marca e a fórmula.");
    await adminRepo.update((db) => {
      const r = saveProduct(db, id, input, actor, new Date().toISOString());
      savedId = r.id;
      return r.db;
    });
  } catch (e) {
    if (e instanceof AdminError) back(returnTo, { erro: e.message });
    throw e;
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  back(`/admin/produtos/${savedId}`, { aviso: id ? "Ficha salva." : "Ração cadastrada como rascunho. Complete os tópicos e publique." });
}

export async function setStatusAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const ids = formData.getAll("ids").filter((v): v is string => typeof v === "string");
  const status = text(formData, "estado") as PublicationStatus;
  const returnTo = safeReturn(text(formData, "voltar"), "/admin/produtos");
  if (!ids.length || !["rascunho", "publicado", "oculto"].includes(status)) back(returnTo, { erro: "Nenhum produto selecionado." });
  let blocked: { id: string; missing: string[] }[] = [];
  let names = new Map<string, string>();
  await adminRepo.update((db) => {
    const r = setProductsStatus(db, ids, status, actor, new Date().toISOString());
    blocked = r.blocked;
    names = new Map(db.products.map((p) => [p.id, productLabel(p)]));
    return r.db;
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  const done = ids.length - blocked.length;
  const verb = status === "publicado" ? "publicado(s)" : status === "oculto" ? "oculto(s)" : "de volta a rascunho";
  if (blocked.length) {
    back(returnTo, {
      ...(done ? { aviso: `${done} produto(s) ${verb}.` } : {}),
      erro: `Não publicado por falta de dados: ${blocked.map((b) => `${names.get(b.id)} (${b.missing.join(", ")})`).join("; ")}.`,
    });
  }
  back(returnTo, { aviso: `${done} produto(s) ${verb}.` });
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (formData.get("confirmo") !== "on") back(`/admin/produtos/${id}`, { erro: "Marque a confirmação para excluir." });
  await mutate("/admin/produtos", (db) => deleteProduct(db, id), "Produto excluído.");
}

// ── Preços nas lojas ───────────────────────────────────────────────────

export async function saveOfferAction(formData: FormData) {
  await requireAdmin();
  const productId = text(formData, "productId");
  const offerId = text(formData, "offerId") || null;
  const returnTo = `/admin/produtos/${productId}#precos`;
  let price: number | null = null;
  try {
    price = parseDecimal(text(formData, "preco"), "Preço");
  } catch (e) {
    if (e instanceof AdminError) back(returnTo, { erro: e.message });
    throw e;
  }
  await mutate(
    returnTo,
    (db) =>
      saveOffer(
        db,
        productId,
        offerId,
        {
          store: text(formData, "loja"),
          price: price == null ? null : Math.round(price * 100) / 100,
          url: orNull(text(formData, "link")),
          sellerName: orNull(text(formData, "vendedor")),
          available: formData.get("disponivel") === "on",
        },
        new Date().toISOString(),
      ),
    offerId ? "Preço atualizado." : "Loja adicionada.",
  );
}

export async function deleteOfferAction(formData: FormData) {
  await requireAdmin();
  const productId = text(formData, "productId");
  await mutate(`/admin/produtos/${productId}#precos`, (db) => deleteOffer(db, productId, text(formData, "offerId"), new Date().toISOString()), "Loja removida.");
}

// ── Dados ──────────────────────────────────────────────────────────────

export async function saveSettingsAction(formData: FormData) {
  await requireAdmin();
  const returnTo = safeReturn(text(formData, "voltar"), "/admin/dados");
  try {
    const pct = (k: string, what: string) => {
      const v = parseDecimal(text(formData, k), what);
      return v == null ? null : v / 100;
    };
    const conversionRate = pct("conversao", "Conversão");
    const commission: Record<string, number | null> = {};
    for (const s of ADMIN_STORES) commission[s.slug] = pct(`comissao_${s.slug}`, `Comissão de ${s.name}`);
    await mutate(returnTo, (db) => saveSettings(db, { conversionRate, commission }), "Taxas salvas.");
  } catch (e) {
    if (e instanceof AdminError) back(returnTo, { erro: e.message });
    throw e;
  }
}

export async function demoEventsAction(formData: FormData) {
  await requireAdmin();
  if (text(formData, "acao") === "remover") {
    await removeDemoEvents();
    back("/admin/dados", { aviso: "Dados de demonstração removidos." });
  }
  await writeDemoEvents(generateDemoEvents(await mockSource.getComparatorItems()));
  back("/admin/dados?fonte=demo", { aviso: "Dados de demonstração carregados (fictícios)." });
}
