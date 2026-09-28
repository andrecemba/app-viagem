import { nowIso, parseJson, type Db } from "@/lib/db/util";

import { getProduct } from "./products";
import { getStore } from "./stores";
import {
  OVERRIDABLE_FIELDS,
  type Availability,
  type DataSource,
  type Offer,
  type OfferEvent,
  type OfferRecord,
  type OfferValues,
  type Override,
  type OverridableField,
} from "./types";
import { divergence, validateAffiliateUrl, validateListingUrl, ValidationError, weightFromTitle } from "./validation";

export { divergence };

interface OfferRow {
  id: number;
  product_id: number;
  store_id: string;
  external_id: string | null;
  data_source: DataSource;
  url: string;
  affiliate_url: string | null;
  price: number | null;
  currency: string;
  price_obtained_at: string | null;
  price_source: string | null;
  previous_price: number | null;
  previous_price_at: string | null;
  availability: Availability;
  free_shipping: number | null;
  listing_title: string | null;
  listing_weight_grams: number | null;
  listing_flavor: string | null;
  image_url: string | null;
  notes: string | null;
  match_status: "confirmada" | "incerta";
  active: number;
  is_demo: number;
  last_checked_at: string | null;
  last_sync_status: "ok" | "erro" | null;
  last_sync_error: string | null;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

const COLUMN: Record<OverridableField, keyof OfferRow> = {
  price: "price",
  previousPrice: "previous_price",
  availability: "availability",
  listingWeightGrams: "listing_weight_grams",
  listingFlavor: "listing_flavor",
  imageUrl: "image_url",
  url: "url",
  affiliateUrl: "affiliate_url",
  freeShipping: "free_shipping",
  notes: "notes",
};

function toRecord(r: OfferRow): OfferRecord {
  return {
    id: r.id,
    productId: r.product_id,
    storeId: r.store_id,
    externalId: r.external_id,
    dataSource: r.data_source,
    url: r.url,
    affiliateUrl: r.affiliate_url,
    price: r.price,
    currency: r.currency,
    priceObtainedAt: r.price_obtained_at,
    priceSource: r.price_source,
    previousPrice: r.previous_price,
    previousPriceAt: r.previous_price_at,
    availability: r.availability,
    freeShipping: r.free_shipping == null ? null : Boolean(r.free_shipping),
    listingTitle: r.listing_title,
    listingWeightGrams: r.listing_weight_grams,
    listingFlavor: r.listing_flavor,
    imageUrl: r.image_url,
    notes: r.notes,
    matchStatus: r.match_status,
    active: Boolean(r.active),
    isDemo: Boolean(r.is_demo),
    lastCheckedAt: r.last_checked_at,
    lastSyncStatus: r.last_sync_status,
    lastSyncError: r.last_sync_error,
    consecutiveFailures: r.consecutive_failures,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Aplica as correções do admin por cima dos valores automáticos. */
export function applyOverrides(record: OfferRecord, overrides: Override[]): Offer {
  const offer: Offer = { ...record, overrides: {}, auto: {} };
  for (const o of overrides) {
    offer.overrides[o.field] = o;
    (offer.auto as Record<string, unknown>)[o.field] = record[o.field];
    (offer as unknown as Record<string, unknown>)[o.field] = o.value;
  }
  return offer;
}

function loadOverrides(db: Db, ids: number[]): Map<number, Override[]> {
  const map = new Map<number, Override[]>();
  if (!ids.length) return map;
  const rows = db
    .prepare(`SELECT * FROM offer_overrides WHERE offer_id IN (${ids.map(() => "?").join(",")})`)
    .all(...ids) as { offer_id: number; field: OverridableField; value: string; created_by: string; created_at: string; note: string | null }[];
  for (const r of rows) {
    const list = map.get(r.offer_id) ?? [];
    list.push({ field: r.field, value: parseJson(r.value, null), createdBy: r.created_by, createdAt: r.created_at, note: r.note });
    map.set(r.offer_id, list);
  }
  return map;
}

export function listOffers(db: Db, opts: { productId?: number; storeId?: string; onlyActive?: boolean } = {}): Offer[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.productId != null) {
    where.push("product_id = ?");
    params.push(opts.productId);
  }
  if (opts.storeId) {
    where.push("store_id = ?");
    params.push(opts.storeId);
  }
  if (opts.onlyActive) where.push("active = 1");
  const rows = db.prepare(`SELECT * FROM offers ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id`).all(...params) as OfferRow[];
  const overrides = loadOverrides(db, rows.map((r) => r.id));
  return rows.map((r) => applyOverrides(toRecord(r), overrides.get(r.id) ?? []));
}

export function getOffer(db: Db, id: number): Offer | null {
  const r = db.prepare("SELECT * FROM offers WHERE id = ?").get(id) as OfferRow | undefined;
  if (!r) return null;
  return applyOverrides(toRecord(r), loadOverrides(db, [id]).get(id) ?? []);
}

export function addEvent(db: Db, e: Omit<OfferEvent, "id" | "at"> & { at?: string }) {
  db.prepare("INSERT INTO offer_events (offer_id, at, kind, actor, price, availability, message) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    e.offerId,
    e.at ?? nowIso(),
    e.kind,
    e.actor,
    e.price,
    e.availability,
    e.message,
  );
}

export function listEvents(db: Db, offerId: number, limit = 50): OfferEvent[] {
  const rows = db.prepare("SELECT * FROM offer_events WHERE offer_id = ? ORDER BY at DESC, id DESC LIMIT ?").all(offerId, limit) as {
    id: number;
    offer_id: number;
    at: string;
    kind: OfferEvent["kind"];
    actor: string;
    price: number | null;
    availability: Availability | null;
    message: string | null;
  }[];
  return rows.map((r) => ({ id: r.id, offerId: r.offer_id, at: r.at, kind: r.kind, actor: r.actor, price: r.price, availability: r.availability, message: r.message }));
}

/** Preços registrados (sincronização, cadastro e correções) para a média de 30 dias. */
export function pricePoints(db: Db, offerIds: number[], since: string): { offerId: number; at: string; price: number }[] {
  if (!offerIds.length) return [];
  return (
    db
      .prepare(
        `SELECT offer_id, at, price FROM offer_events WHERE price IS NOT NULL AND at >= ? AND offer_id IN (${offerIds.map(() => "?").join(",")}) ORDER BY at`,
      )
      .all(since, ...offerIds) as { offer_id: number; at: string; price: number }[]
  ).map((r) => ({ offerId: r.offer_id, at: r.at, price: r.price }));
}

// ── Validação de valores ────────────────────────────────────────────────

function checkValues(db: Db, storeId: string, v: Partial<OfferValues>) {
  const store = getStore(db, storeId);
  if (!store) throw new ValidationError("Loja não encontrada.");
  if (v.url !== undefined) validateListingUrl(store, v.url);
  if (v.affiliateUrl) validateAffiliateUrl(store, v.affiliateUrl);
  for (const [k, label] of [
    ["price", "Preço"],
    ["previousPrice", "Preço anterior"],
  ] as const) {
    const n = v[k];
    if (n != null && (!Number.isFinite(n) || n <= 0 || n > 20000)) throw new ValidationError(`${label} inválido: use um valor maior que zero, ex.: 189,90.`);
  }
  if (v.listingWeightGrams != null && (!Number.isInteger(v.listingWeightGrams) || v.listingWeightGrams < 10 || v.listingWeightGrams > 50000)) {
    throw new ValidationError("Peso do anúncio inválido.");
  }
  if (v.imageUrl && !/^https:\/\//.test(v.imageUrl)) throw new ValidationError("A imagem precisa ser um endereço https://.");
  return store;
}

// ── Criação e edição ────────────────────────────────────────────────────

export interface NewOfferInput extends OfferValues {
  productId: number;
  storeId: string;
  dataSource: DataSource;
  externalId: string | null;
  listingTitle: string | null;
  previousPriceAt: string | null;
  priceSource?: string;
  isDemo?: boolean;
  /** Para dados de exemplo: horário do preço. */
  obtainedAt?: string;
}

export function createOffer(db: Db, input: NewOfferInput, actor: string): Offer {
  const product = getProduct(db, input.productId);
  if (!product) throw new ValidationError("Produto não encontrado.");
  checkValues(db, input.storeId, input);
  if (input.externalId) {
    const dup = db.prepare("SELECT product_id FROM offers WHERE store_id = ? AND external_id = ?").get(input.storeId, input.externalId) as { product_id: number } | undefined;
    if (dup) throw new ValidationError(`Este anúncio (${input.externalId}) já está cadastrado${dup.product_id === product.id ? " neste produto" : " em outro produto"}.`);
  }
  const listingWeight = input.listingWeightGrams ?? weightFromTitle(input.listingTitle);
  const div = divergence(product.weightGrams, product.flavor, { listingWeightGrams: listingWeight, listingFlavor: input.listingFlavor });
  const now = nowIso();
  const at = input.obtainedAt ?? now;
  const r = db
    .prepare(
      `INSERT INTO offers (product_id, store_id, external_id, data_source, url, affiliate_url, price, currency, price_obtained_at, price_source,
        previous_price, previous_price_at, availability, free_shipping, listing_title, listing_weight_grams, listing_flavor, image_url, notes,
        match_status, is_demo, last_checked_at, last_sync_status, created_at, updated_at)
       VALUES (@product_id, @store_id, @external_id, @data_source, @url, @affiliate_url, @price, 'BRL', @price_obtained_at, @price_source,
        @previous_price, @previous_price_at, @availability, @free_shipping, @listing_title, @listing_weight_grams, @listing_flavor, @image_url, @notes,
        @match_status, @is_demo, @last_checked_at, @last_sync_status, @created_at, @updated_at)`,
    )
    .run({
      product_id: product.id,
      store_id: input.storeId,
      external_id: input.externalId,
      data_source: input.dataSource,
      url: input.url,
      affiliate_url: input.affiliateUrl,
      price: input.price,
      price_obtained_at: input.price != null ? at : null,
      price_source: input.price != null ? (input.priceSource ?? input.dataSource) : null,
      previous_price: input.previousPrice,
      previous_price_at: input.previousPrice != null ? input.previousPriceAt : null,
      availability: input.availability,
      free_shipping: input.freeShipping == null ? null : input.freeShipping ? 1 : 0,
      listing_title: input.listingTitle,
      listing_weight_grams: listingWeight,
      listing_flavor: input.listingFlavor,
      image_url: input.imageUrl,
      notes: input.notes,
      match_status: div.weight || div.flavor ? "incerta" : "confirmada",
      is_demo: input.isDemo ? 1 : 0,
      last_checked_at: input.dataSource === "manual" ? null : at,
      last_sync_status: input.dataSource === "manual" ? null : "ok",
      created_at: now,
      updated_at: now,
    });
  const id = Number(r.lastInsertRowid);
  addEvent(db, {
    offerId: id,
    at,
    kind: "criacao",
    actor,
    price: input.price,
    availability: input.availability,
    message: div.weight || div.flavor ? "Cadastrada com divergência de peso ou sabor: marcada para revisão." : "Oferta cadastrada.",
  });
  return getOffer(db, id)!;
}

/**
 * Edição pelo admin. Oferta manual: grava os valores direto. Oferta importada
 * (API ou feed): cada campo alterado vira uma correção, que a próxima
 * sincronização não apaga.
 */
export function updateOffer(
  db: Db,
  id: number,
  changes: Partial<OfferValues> & { previousPriceAt?: string | null; externalId?: string | null },
  actor: string,
  note?: string,
) {
  const offer = getOffer(db, id);
  if (!offer) throw new ValidationError("Oferta não encontrada.");
  checkValues(db, offer.storeId, changes);
  const now = nowIso();

  const changed = OVERRIDABLE_FIELDS.filter((f) => f in changes && !sameValue(changes[f], offer[f]));
  db.transaction(() => {
    if (changes.externalId !== undefined && changes.externalId !== offer.externalId) {
      db.prepare("UPDATE offers SET external_id = ?, updated_at = ? WHERE id = ?").run(changes.externalId || null, now, id);
    }
    if (offer.dataSource === "manual") {
      const sets: string[] = [];
      const params: Record<string, unknown> = { id, now };
      for (const f of changed) {
        sets.push(`${COLUMN[f]} = @${f}`);
        params[f] = f === "freeShipping" ? (changes.freeShipping == null ? null : changes.freeShipping ? 1 : 0) : changes[f];
      }
      if (changed.includes("price")) {
        // O preço que sai vira o "preço anterior", com a data em que valia.
        sets.push("price_obtained_at = @now", "price_source = 'manual'");
        if (!changed.includes("previousPrice") && offer.price != null && changes.price !== offer.price) {
          sets.push("previous_price = @prev", "previous_price_at = @prevAt");
          params.prev = offer.price;
          params.prevAt = offer.priceObtainedAt;
        }
      }
      if (changed.includes("previousPrice")) {
        sets.push("previous_price_at = @previousPriceAt");
        params.previousPriceAt = changes.previousPrice == null ? null : (changes.previousPriceAt ?? now);
      }
      if (sets.length) db.prepare(`UPDATE offers SET ${sets.join(", ")}, updated_at = @now WHERE id = @id`).run(params);
    } else {
      const put = db.prepare(
        `INSERT INTO offer_overrides (offer_id, field, value, created_by, created_at, note) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (offer_id, field) DO UPDATE SET value = excluded.value, created_by = excluded.created_by, created_at = excluded.created_at, note = excluded.note`,
      );
      for (const f of changed) put.run(id, f, JSON.stringify(changes[f] ?? null), actor, now, note ?? null);
      if (changed.length) db.prepare("UPDATE offers SET updated_at = ? WHERE id = ?").run(now, id);
    }
    if (changed.length) {
      const next = getOffer(db, id)!;
      addEvent(db, {
        offerId: id,
        kind: offer.dataSource === "manual" ? "edicao" : "correcao",
        actor,
        price: changed.includes("price") ? next.price : null,
        availability: changed.includes("availability") ? next.availability : null,
        message: `${offer.dataSource === "manual" ? "Editado" : "Correção manual"}: ${changed.map(fieldLabel).join(", ")}${note ? ` (“${note}”)` : ""}.`,
      });
      recheckMatch(db, id);
    }
  })();
  return getOffer(db, id)!;
}

/** Remove a correção de um campo: volta a valer o valor importado. */
export function revertOverride(db: Db, id: number, field: OverridableField, actor: string) {
  const offer = getOffer(db, id);
  if (!offer?.overrides[field]) throw new ValidationError("Este campo não tem correção manual.");
  db.transaction(() => {
    db.prepare("DELETE FROM offer_overrides WHERE offer_id = ? AND field = ?").run(id, field);
    const next = getOffer(db, id)!;
    addEvent(db, {
      offerId: id,
      kind: "volta_automatico",
      actor,
      price: field === "price" ? next.price : null,
      availability: field === "availability" ? next.availability : null,
      message: `${fieldLabel(field)} voltou ao valor automático.`,
    });
    recheckMatch(db, id);
  })();
}

/** Nova divergência de peso/sabor manda a oferta para revisão. */
function recheckMatch(db: Db, id: number) {
  const offer = getOffer(db, id)!;
  const product = getProduct(db, offer.productId)!;
  const d = divergence(product.weightGrams, product.flavor, offer);
  if ((d.weight || d.flavor) && offer.matchStatus === "confirmada") {
    db.prepare("UPDATE offers SET match_status = 'incerta' WHERE id = ?").run(id);
  }
}

export function setMatchStatus(db: Db, id: number, status: "confirmada" | "incerta", actor: string, note?: string) {
  db.prepare("UPDATE offers SET match_status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);
  addEvent(db, {
    offerId: id,
    kind: "confirmacao",
    actor,
    price: null,
    availability: null,
    message: status === "confirmada" ? `Correspondência com o produto confirmada${note ? ` (“${note}”)` : ""}.` : "Marcada para revisão de correspondência.",
  });
}

export function setOfferActive(db: Db, id: number, active: boolean, actor: string) {
  db.prepare("UPDATE offers SET active = ?, updated_at = ? WHERE id = ?").run(active ? 1 : 0, nowIso(), id);
  addEvent(db, { offerId: id, kind: "edicao", actor, price: null, availability: null, message: active ? "Oferta reativada." : "Oferta desativada (sai do site)." });
}

// ── Sincronização ───────────────────────────────────────────────────────

export interface SyncValues {
  price: number | null;
  availability: Availability;
  freeShipping: boolean | null;
  listingTitle: string | null;
  listingWeightGrams: number | null;
  imageUrl: string | null;
  obtainedAt: string;
  source: string;
}

/** Grava a leitura automática nos valores automáticos. Correções do admin continuam valendo. */
export function applySyncResult(db: Db, id: number, v: SyncValues) {
  const before = db.prepare("SELECT * FROM offers WHERE id = ?").get(id) as OfferRow | undefined;
  if (!before) return;
  const product = getProduct(db, before.product_id)!;
  const listingWeight = v.listingWeightGrams ?? weightFromTitle(v.listingTitle) ?? before.listing_weight_grams;
  const priceChanged = v.price != null && before.price != null && v.price !== before.price;
  const newDivergence = listingWeight != null && listingWeight !== product.weightGrams && listingWeight !== before.listing_weight_grams;
  db.transaction(() => {
    db.prepare(
      `UPDATE offers SET price = COALESCE(@price, price), price_obtained_at = CASE WHEN @price IS NULL THEN price_obtained_at ELSE @at END,
        price_source = CASE WHEN @price IS NULL THEN price_source ELSE @source END,
        previous_price = CASE WHEN @changed THEN price ELSE previous_price END,
        previous_price_at = CASE WHEN @changed THEN price_obtained_at ELSE previous_price_at END,
        availability = @availability, free_shipping = @free_shipping, listing_title = COALESCE(@title, listing_title),
        listing_weight_grams = @weight, image_url = COALESCE(@image, image_url),
        match_status = CASE WHEN @diverge THEN 'incerta' ELSE match_status END,
        last_checked_at = @at, last_sync_status = 'ok', last_sync_error = NULL, consecutive_failures = 0, updated_at = @at
       WHERE id = @id`,
    ).run({
      id,
      price: v.price,
      at: v.obtainedAt,
      source: v.source,
      changed: priceChanged ? 1 : 0,
      availability: v.availability,
      free_shipping: v.freeShipping == null ? null : v.freeShipping ? 1 : 0,
      title: v.listingTitle,
      weight: listingWeight,
      image: v.imageUrl,
      diverge: newDivergence ? 1 : 0,
    });
    addEvent(db, {
      offerId: id,
      at: v.obtainedAt,
      kind: "sincronizacao",
      actor: v.source,
      price: v.price,
      availability: v.availability,
      message: newDivergence ? `Peso do anúncio (${listingWeight} g) diferente do produto: marcada para revisão.` : priceChanged ? `Preço mudou de ${brl(before.price!)} para ${brl(v.price!)}.` : "Atualizada.",
    });
  })();
}

/** Falha na consulta: registra e mantém o último preço válido. */
export function applySyncFailure(db: Db, id: number, message: string, source: string) {
  const at = nowIso();
  db.prepare(
    "UPDATE offers SET last_checked_at = ?, last_sync_status = 'erro', last_sync_error = ?, consecutive_failures = consecutive_failures + 1 WHERE id = ?",
  ).run(at, message.slice(0, 500), id);
  addEvent(db, { offerId: id, at, kind: "erro", actor: source, price: null, availability: null, message: message.slice(0, 500) });
}

// ── Utilidades ──────────────────────────────────────────────────────────

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function sameValue(a: unknown, b: unknown) {
  return (a ?? null) === (b ?? null);
}

export const FIELD_LABELS: Record<OverridableField, string> = {
  price: "preço",
  previousPrice: "preço anterior",
  availability: "disponibilidade",
  listingWeightGrams: "peso do anúncio",
  listingFlavor: "sabor do anúncio",
  imageUrl: "imagem",
  url: "URL original",
  affiliateUrl: "link de afiliado",
  freeShipping: "selo de frete grátis",
  notes: "observações",
};

function fieldLabel(f: OverridableField) {
  return FIELD_LABELS[f];
}
