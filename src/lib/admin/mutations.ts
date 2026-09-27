import { productLabel } from "./alerts";
import { newHistoryId } from "./checks";
import { acceptAutoValue, applyAutoValue, applyManualValue, emptyField, sameValue, setLock, setReviewDate } from "./fields";
import { FIELD_LABEL, SENSITIVE_PRODUCT_FIELDS } from "./labels";
import type {
  AdminDb,
  AdminOffer,
  AdminProduct,
  FieldState,
  HistoryEvent,
  OfferFieldKey,
  ProductFieldKey,
  ProductFields,
  PublicationStatus,
} from "./types";

/**
 * Operações da administração como funções puras sobre o banco (testáveis).
 * As server actions só validam a entrada, chamam estas funções e gravam.
 */

export class AdminError extends Error {}

const ev = (e: Omit<HistoryEvent, "id">): HistoryEvent => ({ id: newHistoryId(), ...e });

function productEvent(p: AdminProduct, actor: string, at: string, partial: Partial<HistoryEvent> & Pick<HistoryEvent, "type" | "message">): HistoryEvent {
  return ev({ entity: "product", entityId: p.id, productId: p.id, offerId: null, result: "ok", actor, at, ...partial });
}

function withProduct(db: AdminDb, id: string, fn: (p: AdminProduct) => { product: AdminProduct; events: HistoryEvent[] }): AdminDb {
  const current = db.products.find((p) => p.id === id);
  if (!current) throw new AdminError("Produto não encontrado.");
  const { product, events } = fn(current);
  return { ...db, products: db.products.map((p) => (p.id === id ? product : p)), history: [...db.history, ...events] };
}

function withOffer(db: AdminDb, id: string, fn: (o: AdminOffer) => { offer: AdminOffer; events: HistoryEvent[] }): AdminDb {
  const current = db.offers.find((o) => o.id === id);
  if (!current) throw new AdminError("Oferta não encontrada.");
  const { offer, events } = fn(current);
  return { ...db, offers: db.offers.map((o) => (o.id === id ? offer : o)), history: [...db.history, ...events] };
}

// ── Produtos ───────────────────────────────────────────────────────────

export type ProductInput = Partial<{ [K in ProductFieldKey]: ProductFields[K]["value"] }>;

const REQUIRED_TO_PUBLISH: ProductFieldKey[] = ["brand", "formula", "species", "lifeStage", "weightGrams", "foodType"];

export function missingForPublish(p: AdminProduct): string[] {
  return REQUIRED_TO_PUBLISH.filter((k) => p.fields[k].value == null || p.fields[k].value === "").map((k) => FIELD_LABEL[k]);
}

export function createProduct(db: AdminDb, input: ProductInput, sourceUrl: string | null, actor: string, now: Date) {
  const at = now.toISOString();
  const fields = {} as ProductFields;
  for (const key of Object.keys(FIELD_LABEL) as ProductFieldKey[]) {
    const value = input[key] ?? null;
    const empty = emptyField<never>();
    (fields as unknown as Record<string, FieldState<unknown>>)[key] =
      value == null || value === "" ? empty : { ...applyManualValue(empty as FieldState<unknown>, value, actor, at, { lock: true }), verification: "pendente" };
  }
  const id = `prd-${now.getTime().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  const product: AdminProduct = {
    id,
    status: "rascunho",
    fields,
    sources: sourceUrl ? [{ url: sourceUrl, kind: "loja", evidence: "Informado no cadastro manual", checkedHow: "Cadastro manual", checkedAt: at }] : [],
    verificationNote: "",
    imageStatus: fields.imageUrl.value ? "nao_verificada" : "ausente",
    createdAt: at,
    updatedAt: at,
  };
  const history = productEvent(product, actor, at, { type: "criacao", message: "Ficha cadastrada manualmente (rascunho). Campos ficam “pendentes de verificação” até a conferência." });
  return { db: { ...db, products: [...db.products, product], history: [...db.history, history] }, id };
}

export function editProductField<K extends ProductFieldKey>(
  db: AdminDb,
  id: string,
  key: K,
  value: ProductFields[K]["value"],
  opts: { lock: boolean; reviewAt: string | null; note?: string; verified?: boolean },
  actor: string,
  now: Date,
): AdminDb {
  const at = now.toISOString();
  return withProduct(db, id, (p) => {
    const field = p.fields[key] as FieldState<unknown>;
    if (sameValue(field.value, value) && field.locked === opts.lock && field.reviewAt === opts.reviewAt && !opts.verified) {
      return { product: p, events: [] };
    }
    let next = applyManualValue(field, value, actor, at, { lock: opts.lock, note: opts.note, reviewAt: opts.reviewAt });
    if (opts.verified && value != null && value !== "") next = { ...next, verification: "verificado" };
    const product: AdminProduct = {
      ...p,
      fields: { ...p.fields, [key]: next },
      imageStatus: key === "imageUrl" ? (value ? "nao_verificada" : "ausente") : p.imageStatus,
      updatedAt: at,
    };
    const events = [
      productEvent(p, actor, at, {
        type: "edicao_manual",
        field: key,
        from: field.value,
        to: value,
        message: `${FIELD_LABEL[key]}: correção manual${opts.lock ? " (travada)" : ""}${opts.reviewAt ? `, revisar em ${new Date(opts.reviewAt).toLocaleDateString("pt-BR")}` : ""}${opts.verified ? ", marcada como verificada" : ""}.${opts.note ? ` Nota: ${opts.note}` : ""}`,
      }),
    ];
    return { product, events };
  });
}

export function productFieldAction(
  db: AdminDb,
  id: string,
  key: ProductFieldKey,
  action: "lock" | "unlock" | "accept_auto" | "clear_review",
  actor: string,
  now: Date,
): AdminDb {
  const at = now.toISOString();
  return withProduct(db, id, (p) => {
    const field = p.fields[key] as FieldState<unknown>;
    let next = field;
    let message = "";
    if (action === "lock") [next, message] = [setLock(field, true), "Campo travado."];
    if (action === "unlock") [next, message] = [setLock(field, false), "Trava removida: a próxima importação pode atualizar o valor."];
    if (action === "clear_review") [next, message] = [setReviewDate(field, null), "Data de revisão removida."];
    if (action === "accept_auto") {
      if (!field.pendingAuto && !field.auto) throw new AdminError("Não há valor automático para aceitar.");
      next = acceptAutoValue(field);
      message = `Valor automático aceito (${String(next.value)}); correção manual removida.`;
    }
    return {
      product: { ...p, fields: { ...p.fields, [key]: next }, updatedAt: at },
      events: [productEvent(p, actor, at, { type: action === "accept_auto" ? "importacao" : "trava", field: key, from: field.value, to: next.value, message: `${FIELD_LABEL[key]}: ${message}` })],
    };
  });
}

/** Importação de valores de catálogo (conector ou arquivo). Respeita travas e campos sensíveis. */
export function importProductValues(db: AdminDb, id: string, values: ProductInput, source: string, actor: string, now: Date): AdminDb {
  const at = now.toISOString();
  return withProduct(db, id, (p) => {
    const fields = { ...p.fields };
    const events: HistoryEvent[] = [];
    for (const key of Object.keys(values) as ProductFieldKey[]) {
      const res = applyAutoValue(fields[key] as FieldState<unknown>, values[key], source, at, { sensitive: SENSITIVE_PRODUCT_FIELDS.includes(key) });
      (fields as unknown as Record<string, FieldState<unknown>>)[key] = res.field;
      if (res.outcome === "unchanged" || res.outcome === "ignored_empty") continue;
      events.push(
        productEvent(p, actor, at, {
          type: "importacao",
          field: key,
          from: res.previous,
          to: values[key],
          result: res.outcome === "held" ? "pendente" : "ok",
          message:
            res.outcome === "held"
              ? `${FIELD_LABEL[key]}: novo valor recebido e retido para revisão (campo ${fields[key].locked ? "travado" : "sensível"}).`
              : res.outcome === "replaced_manual"
                ? `${FIELD_LABEL[key]}: importação substituiu correção manual sem trava.`
                : `${FIELD_LABEL[key]}: valor importado.`,
        }),
      );
    }
    return { product: { ...p, fields, updatedAt: at }, events };
  });
}

export function setProductsStatus(db: AdminDb, ids: string[], status: PublicationStatus, actor: string, now: Date) {
  const at = now.toISOString();
  const blocked: { id: string; label: string; missing: string[] }[] = [];
  let next = db;
  for (const id of ids) {
    const p = next.products.find((x) => x.id === id);
    if (!p || p.status === status) continue;
    if (status === "publicado") {
      const missing = missingForPublish(p);
      if (missing.length) {
        blocked.push({ id, label: productLabel(p) || id, missing });
        continue;
      }
    }
    next = withProduct(next, id, (prod) => ({
      product: { ...prod, status, updatedAt: at },
      events: [productEvent(prod, actor, at, { type: "status", from: prod.status, to: status, message: `Estado alterado para ${status}.` })],
    }));
  }
  return { db: next, blocked };
}

export function updateProductMeta(db: AdminDb, id: string, meta: { verificationNote?: string; addSource?: { url: string; evidence: string } }, actor: string, now: Date) {
  const at = now.toISOString();
  return withProduct(db, id, (p) => {
    const sources = meta.addSource
      ? [...p.sources, { url: meta.addSource.url, kind: "loja" as const, evidence: meta.addSource.evidence, checkedHow: `Informado por ${actor}`, checkedAt: at }]
      : p.sources;
    return {
      product: { ...p, sources, verificationNote: meta.verificationNote ?? p.verificationNote, updatedAt: at },
      events: [productEvent(p, actor, at, { type: "edicao_manual", message: meta.addSource ? `Fonte adicionada: ${meta.addSource.url}` : "Nota de verificação atualizada." })],
    };
  });
}

// ── Ofertas ────────────────────────────────────────────────────────────

export interface OfferInput {
  productId: string;
  storeId: string;
  externalId: string;
  price: number | null;
  availability: AdminOffer["fields"]["availability"]["value"];
  url: string | null;
  affiliateUrl: string | null;
  sellerName: string | null;
  listingTitle: string | null;
  commissionEligibility: AdminOffer["commissionEligibility"];
}

export function createOffer(db: AdminDb, input: OfferInput, actor: string, now: Date) {
  const at = now.toISOString();
  if (!db.products.some((p) => p.id === input.productId)) throw new AdminError("Produto não encontrado.");
  if (!db.stores.some((s) => s.id === input.storeId)) throw new AdminError("Loja não encontrada.");
  const m = <T,>(v: T | null) => (v == null || v === "" ? emptyField<T>() : applyManualValue(emptyField<T>(), v, actor, at, { lock: false }));
  const id = `ofr-${now.getTime().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  const offer: AdminOffer = {
    id,
    productId: input.productId,
    storeId: input.storeId,
    externalId: input.externalId,
    fields: {
      price: m(input.price),
      availability: m(input.availability),
      url: m(input.url),
      affiliateUrl: m(input.affiliateUrl),
      sellerName: m(input.sellerName),
      listingTitle: m(input.listingTitle),
      variationLabel: emptyField(),
    },
    hidden: null,
    dataOrigin: "manual",
    commissionEligibility: input.commissionEligibility,
    demo: false,
    lastCheckedAt: input.price ? at : null,
    lastSuccessAt: input.price ? at : null,
    consecutiveFailures: 0,
    lastError: null,
    linkStatus: "nao_verificado",
    imageStatus: "nao_verificada",
    sellerChangedAt: null,
    variationChangedAt: null,
    createdAt: at,
    updatedAt: at,
  };
  const events = [
    ev({ entity: "offer", entityId: id, productId: input.productId, offerId: id, at, actor, type: "criacao", result: "ok", message: "Oferta cadastrada manualmente." }),
    ...(input.price
      ? [ev({ entity: "offer", entityId: id, productId: input.productId, offerId: id, at, actor, type: "preco" as const, field: "price", from: null, to: input.price, result: "ok" as const, message: "Preço informado manualmente." })]
      : []),
  ];
  return { db: { ...db, offers: [...db.offers, offer], history: [...db.history, ...events] }, id };
}

export function editOfferField<K extends OfferFieldKey>(
  db: AdminDb,
  id: string,
  key: K,
  value: AdminOffer["fields"][K]["value"],
  opts: { lock: boolean; reviewAt: string | null; note?: string },
  actor: string,
  now: Date,
): AdminDb {
  const at = now.toISOString();
  return withOffer(db, id, (o) => {
    const field = o.fields[key] as FieldState<unknown>;
    if (sameValue(field.value, value) && field.locked === opts.lock && field.reviewAt === opts.reviewAt) return { offer: o, events: [] };
    if (key === "price" && value != null && !((value as number) > 0)) throw new AdminError("Preço precisa ser maior que zero.");
    const next = applyManualValue(field, value, actor, at, opts);
    const offer: AdminOffer = {
      ...o,
      fields: { ...o.fields, [key]: next },
      // Preço confirmado à mão conta como atualização bem-sucedida.
      lastSuccessAt: key === "price" && value != null ? at : o.lastSuccessAt,
      linkStatus: key === "affiliateUrl" ? "nao_verificado" : o.linkStatus,
      updatedAt: at,
    };
    return {
      offer,
      events: [
        ev({ entity: "offer", entityId: id, productId: o.productId, offerId: id, at, actor, type: key === "price" ? "preco" : "edicao_manual", field: key,
          from: field.value, to: value, result: "ok",
          message: `Correção manual de ${key}${opts.lock ? " (travada)" : ""}.${opts.note ? ` Nota: ${opts.note}` : ""}` }),
      ],
    };
  });
}

export function offerFieldAction(db: AdminDb, id: string, key: OfferFieldKey, action: "lock" | "unlock" | "accept_auto" | "clear_review", actor: string, now: Date) {
  const at = now.toISOString();
  return withOffer(db, id, (o) => {
    const field = o.fields[key] as FieldState<unknown>;
    if (action === "accept_auto" && !field.pendingAuto && !field.auto) throw new AdminError("Não há valor automático para aceitar.");
    const next =
      action === "lock" ? setLock(field, true) : action === "unlock" ? setLock(field, false) : action === "clear_review" ? setReviewDate(field, null) : acceptAutoValue(field);
    return {
      offer: { ...o, fields: { ...o.fields, [key]: next }, updatedAt: at },
      events: [ev({ entity: "offer", entityId: id, productId: o.productId, offerId: id, at, actor, type: action === "accept_auto" ? "importacao" : "trava",
        field: key, from: field.value, to: next.value, result: "ok",
        message: action === "lock" ? `Campo ${key} travado.` : action === "unlock" ? `Trava de ${key} removida.` : action === "clear_review" ? `Data de revisão de ${key} removida.` : `Valor automático de ${key} aceito.` })],
    };
  });
}

export function setOfferHidden(db: AdminDb, id: string, hidden: boolean, reason: string, actor: string, now: Date) {
  const at = now.toISOString();
  if (hidden && !reason.trim()) throw new AdminError("Informe o motivo para ocultar a oferta.");
  return withOffer(db, id, (o) => ({
    offer: { ...o, hidden: hidden ? { reason, by: actor, at } : null, updatedAt: at },
    events: [ev({ entity: "offer", entityId: id, productId: o.productId, offerId: id, at, actor, type: "status", result: "ok",
      message: hidden ? `Oferta ocultada: ${reason}` : "Oferta voltou a ficar visível." })],
  }));
}

export function setOfferEligibility(db: AdminDb, id: string, value: AdminOffer["commissionEligibility"], actor: string, now: Date) {
  const at = now.toISOString();
  return withOffer(db, id, (o) => ({
    offer: { ...o, commissionEligibility: value, updatedAt: at },
    events: [ev({ entity: "offer", entityId: id, productId: o.productId, offerId: id, at, actor, type: "edicao_manual", from: o.commissionEligibility, to: value, result: "ok",
      message: `Elegibilidade para comissão: ${value}.` })],
  }));
}

/** Troca o produto vinculado. Exige confirmação explícita depois de ver as diferenças. */
export function relinkOffer(db: AdminDb, id: string, productId: string, actor: string, now: Date) {
  const at = now.toISOString();
  const target = db.products.find((p) => p.id === productId);
  if (!target) throw new AdminError("Produto de destino não encontrado.");
  return withOffer(db, id, (o) => {
    const from = db.products.find((p) => p.id === o.productId);
    return {
      offer: { ...o, productId, updatedAt: at },
      events: [ev({ entity: "offer", entityId: id, productId, offerId: id, at, actor, type: "vinculo", from: o.productId, to: productId, result: "ok",
        message: `Oferta movida de “${from ? productLabel(from) : o.productId}” para “${productLabel(target)}”.` })],
    };
  });
}

// ── Alertas ────────────────────────────────────────────────────────────

export function ignoreAlert(db: AdminDb, id: string, justification: string, actor: string, now: Date): AdminDb {
  if (justification.trim().length < 5) throw new AdminError("Escreva uma justificativa (mínimo 5 caracteres).");
  const at = now.toISOString();
  const alert = db.alerts.find((a) => a.id === id);
  if (!alert) throw new AdminError("Alerta não encontrado.");
  return {
    ...db,
    alerts: db.alerts.map((a) => (a.id === id ? { ...a, status: "ignorado", resolution: { by: actor, at, note: justification.trim(), action: "ignorado" } } : a)),
    history: [
      ...db.history,
      ev({ entity: alert.offerId ? "offer" : alert.productId ? "product" : "store", entityId: alert.offerId ?? alert.productId ?? alert.storeId ?? "sistema",
        productId: alert.productId, offerId: alert.offerId, at, actor, type: "alerta", result: "ignorado",
        message: `Alerta ignorado: ${alert.title}. Justificativa: ${justification.trim()}` }),
    ],
  };
}

export function reopenAlert(db: AdminDb, id: string): AdminDb {
  return { ...db, alerts: db.alerts.map((a) => (a.id === id ? { ...a, status: "aberto", resolution: null } : a)) };
}

// ── Lojas ──────────────────────────────────────────────────────────────

export function updateStoreRules(
  db: AdminDb,
  id: string,
  rules: { frequencyHours: number; staleAfterHours: number; hideStaleAfterHours: number | null },
  actor: string,
  now: Date,
): AdminDb {
  if (!(rules.frequencyHours >= 1 && rules.frequencyHours <= 24 * 30)) throw new AdminError("Frequência entre 1 h e 30 dias.");
  if (!(rules.staleAfterHours >= rules.frequencyHours)) throw new AdminError("O prazo de desatualização deve ser maior ou igual à frequência.");
  if (rules.hideStaleAfterHours != null && rules.hideStaleAfterHours < rules.staleAfterHours) {
    throw new AdminError("Ocultar só depois de a oferta estar desatualizada.");
  }
  const at = now.toISOString();
  return {
    ...db,
    stores: db.stores.map((s) => (s.id === id ? { ...s, ...rules } : s)),
    history: [
      ...db.history,
      ev({ entity: "store", entityId: id, productId: null, offerId: null, at, actor, type: "edicao_manual", result: "ok",
        message: `Regras da loja atualizadas: consulta a cada ${rules.frequencyHours} h, desatualizada após ${rules.staleAfterHours} h, ${rules.hideStaleAfterHours == null ? "nunca ocultar" : `ocultar após ${rules.hideStaleAfterHours} h`}.` }),
    ],
  };
}
