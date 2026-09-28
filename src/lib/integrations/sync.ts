import { nowIso, type Db } from "@/lib/db/util";
import { applySyncFailure, applySyncResult, getOffer, listOffers } from "@/lib/domain/offers";
import { getSettings } from "@/lib/domain/settings";
import { getStore, listStores } from "@/lib/domain/stores";
import type { Store } from "@/lib/domain/types";
import { normalizeCep } from "@/lib/domain/validation";

import { logIntegrationError } from "./http";
import { sourceForStore } from "./index";
import { ERROR_LABEL, IntegrationError } from "./types";

export interface SyncReport {
  storeId: string;
  checked: number;
  updated: number;
  failed: number;
  skipped: string | null;
}

const errorMessage = (e: unknown) => (e instanceof IntegrationError ? `${ERROR_LABEL[e.kind]}: ${e.message}` : e instanceof Error ? e.message : String(e));

/** Ofertas vencidas: nunca consultadas ou com a última consulta mais velha que o prazo. */
function dueOffers(db: Db, store: Store, force: boolean, offerIds?: number[]) {
  const { staleHours } = getSettings(db);
  const limit = new Date(Date.now() - staleHours * 0.9 * 3600_000).toISOString();
  return listOffers(db, { storeId: store.id, onlyActive: true }).filter(
    (o) => o.dataSource === "api" && o.externalId && (offerIds ? offerIds.includes(o.id) : force || !o.lastCheckedAt || o.lastCheckedAt < limit),
  );
}

/** Atualiza as ofertas de uma loja. Uma oferta com erro não impede as outras. */
export async function syncStore(db: Db, storeId: string, opts: { trigger: string; force?: boolean; offerIds?: number[]; concurrency?: number }): Promise<SyncReport> {
  const store = getStore(db, storeId);
  const report: SyncReport = { storeId, checked: 0, updated: 0, failed: 0, skipped: null };
  if (!store || !store.active) return { ...report, skipped: "Loja inativa." };
  const src = sourceForStore(store, db);
  const status = src.status();
  if (store.mode !== "api" || !src.fetchListing || status.state !== "ativa" || !src.capabilities().refreshPrice) {
    return { ...report, skipped: status.state === "pendente" ? `Integração pendente: ${status.note}` : "Loja sem integração por API: atualização manual ou por arquivo." };
  }
  const offers = dueOffers(db, store, Boolean(opts.force), opts.offerIds);
  const run = db.prepare("INSERT INTO sync_runs (store_id, trigger, started_at) VALUES (?, ?, ?)").run(store.id, opts.trigger, nowIso());
  const queue = [...offers];
  const worker = async () => {
    for (let o = queue.shift(); o; o = queue.shift()) {
      report.checked++;
      try {
        const l = await src.fetchListing!(o.externalId!, { url: o.url });
        applySyncResult(db, o.id, {
          price: l.price,
          availability: l.availability,
          freeShipping: l.freeShipping,
          listingTitle: l.title,
          listingWeightGrams: l.listingWeightGrams,
          imageUrl: l.imageUrl,
          obtainedAt: l.obtainedAt,
          source: `api:${src.id}`,
        });
        report.updated++;
      } catch (e) {
        report.failed++;
        logIntegrationError(src.id, e);
        applySyncFailure(db, o.id, errorMessage(e), `api:${src.id}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 2, queue.length || 1) }, worker));
  db.prepare("UPDATE sync_runs SET finished_at = ?, checked = ?, updated = ?, failed = ?, message = ? WHERE id = ?").run(
    nowIso(),
    report.checked,
    report.updated,
    report.failed,
    report.checked ? null : "Nenhuma oferta vencida.",
    run.lastInsertRowid,
  );
  return report;
}

/** Todas as lojas em paralelo: a falha ou demora de uma não bloqueia as demais. */
export async function syncAll(db: Db, trigger: string): Promise<SyncReport[]> {
  const stores = listStores(db, { onlyActive: true }).filter((s) => s.mode === "api");
  const results = await Promise.allSettled(stores.map((s) => syncStore(db, s.id, { trigger })));
  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { storeId: stores[i].id, checked: 0, updated: 0, failed: 0, skipped: `Erro inesperado: ${errorMessage(r.reason)}` },
  );
}

/** "Atualizar agora" de uma oferta. */
export async function refreshOffer(db: Db, offerId: number) {
  const offer = getOffer(db, offerId);
  if (!offer) throw new Error("Oferta não encontrada.");
  return syncStore(db, offer.storeId, { trigger: "manual", offerIds: [offerId] });
}

// ── Frete por CEP ───────────────────────────────────────────────────────

export type QuoteOutcome =
  | { status: "cotado"; cost: number; deadlineDays: number | null; quotedAt: string; expiresAt: string }
  | { status: "sem_cotacao"; reason: string };

export async function quoteShipping(db: Db, offerId: number, rawCep: string): Promise<QuoteOutcome> {
  const cep = normalizeCep(rawCep);
  if (!cep) return { status: "sem_cotacao", reason: "CEP inválido." };
  const now = nowIso();
  const hit = db
    .prepare("SELECT cost, deadline_days, quoted_at, expires_at FROM shipping_quotes WHERE offer_id = ? AND cep = ? AND expires_at > ? ORDER BY quoted_at DESC LIMIT 1")
    .get(offerId, cep, now) as { cost: number; deadline_days: number | null; quoted_at: string; expires_at: string } | undefined;
  if (hit) return { status: "cotado", cost: hit.cost, deadlineDays: hit.deadline_days, quotedAt: hit.quoted_at, expiresAt: hit.expires_at };

  const offer = getOffer(db, offerId);
  const store = offer && getStore(db, offer.storeId);
  if (!offer || !store || !offer.externalId) return { status: "sem_cotacao", reason: "Frete não cotado para esta loja." };
  const src = sourceForStore(store, db);
  if (!src.quoteShipping || !src.capabilities().shippingQuote) return { status: "sem_cotacao", reason: "Esta loja não oferece cotação de frete pela integração." };
  try {
    const q = await src.quoteShipping(offer.externalId, cep);
    const hours = getSettings(db).shippingQuoteHours;
    const expiresAt = new Date(Date.now() + hours * 3600_000).toISOString();
    db.prepare("INSERT INTO shipping_quotes (offer_id, cep, cost, currency, deadline_days, quoted_at, expires_at, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      offerId,
      cep,
      q.cost,
      q.currency,
      q.deadlineDays,
      now,
      expiresAt,
      `api:${src.id}`,
    );
    return { status: "cotado", cost: q.cost, deadlineDays: q.deadlineDays, quotedAt: now, expiresAt };
  } catch (e) {
    logIntegrationError(src.id, e);
    return { status: "sem_cotacao", reason: "Não foi possível cotar o frete agora." };
  }
}
