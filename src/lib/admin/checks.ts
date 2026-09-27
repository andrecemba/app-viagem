import { applyAutoValue } from "./fields";
import type { AdminDb, AdminOffer, Availability, CheckRun, HistoryEvent, RunStoreResult, StoreConfig } from "./types";

/**
 * Verificação de ofertas. Cada loja tem (ou terá) um conector próprio, com as
 * regras da plataforma. Nenhum conector real está implementado: sem conector,
 * a consulta NÃO acontece e a execução registra "pendente de configuração".
 * O único conector existente é o de demonstração, que só atua em ofertas `demo`.
 */

export interface CheckReading {
  price?: number | null;
  availability?: Availability | null;
  sellerName?: string | null;
  listingTitle?: string | null;
  variationLabel?: string | null;
  linkStatus?: AdminOffer["linkStatus"];
  imageStatus?: AdminOffer["imageStatus"];
}

export type CheckResult = { ok: true; reading: CheckReading } | { ok: false; error: string };

export interface StoreConnector {
  /** Nome exibido nas execuções e no histórico. */
  label: string;
  checkOffer(offer: AdminOffer, store: StoreConfig, attempt: number): Promise<CheckResult>;
}

/**
 * Conectores reais registrados por loja. Vazio de propósito: cada integração
 * entra aqui só depois de credenciais aprovadas e condições de uso conferidas.
 */
const realConnectors: Record<string, StoreConnector> = {};

export function connectorFor(store: StoreConfig): StoreConnector | null {
  return realConnectors[store.id] ?? null;
}

export function integrationState(store: StoreConfig): { status: "pendente_configuracao" | "credenciais_sem_conector" | "configurada" | "somente_manual"; missingEnv: string[] } {
  const missingEnv = store.integration.requiredEnv.filter((k) => !process.env[k]);
  if (store.integration.kind === "somente_manual") return { status: "somente_manual", missingEnv };
  if (missingEnv.length) return { status: "pendente_configuracao", missingEnv };
  return { status: connectorFor(store) ? "configurada" : "credenciais_sem_conector", missingEnv };
}

// ── Conector de demonstração ─────────────────────────────────────────────

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export const demoConnector: StoreConnector = {
  label: "Conector de demonstração (dados fictícios)",
  async checkOffer(offer, _store, attempt) {
    const r = hash(`${offer.id}:${attempt}`);
    const scenario = offer.externalId.split("-")[1] ?? "";
    const price = offer.fields.price.value ?? 100;
    if (scenario === "FALHA") return { ok: false, error: "Tempo de resposta esgotado (simulado)" };
    if (scenario !== "OK" && r < 0.08) return { ok: false, error: "Serviço da loja respondeu com erro 503 (simulado)" };
    const reading: CheckReading = {
      price: Math.round(price * (0.97 + r * 0.06) * 10) / 10 + 0.09,
      availability: "disponivel",
      linkStatus: "ok",
    };
    if (scenario === "PRECO") reading.price = Math.round(price * 1.7) + 0.9;
    if (scenario === "REMOVIDO") reading.availability = "removido";
    if (scenario === "VENDEDOR") reading.sellerName = `Loja parceira ${Math.floor(r * 90) + 10}`;
    if (scenario === "VARIACAO") reading.variationLabel = "3 kg";
    if (scenario === "LINK") reading.linkStatus = "redireciona_outro";
    return { ok: true, reading };
  },
};

// ── Aplicação de uma leitura ─────────────────────────────────────────────

let seq = 0;
export const newHistoryId = () => `his-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function applyReading(offer: AdminOffer, reading: CheckReading, source: string, at: string) {
  const events: Omit<HistoryEvent, "id">[] = [];
  const base = { entity: "offer" as const, entityId: offer.id, productId: offer.productId, offerId: offer.id, actor: "automação", demo: offer.demo };
  const next: AdminOffer = { ...offer, fields: { ...offer.fields } };

  const priceResult = applyAutoValue(next.fields.price, reading.price, source, at);
  next.fields.price = priceResult.field;
  if (priceResult.outcome === "applied" || priceResult.outcome === "replaced_manual") {
    events.push({ ...base, at, type: "preco", field: "price", from: priceResult.previous, to: priceResult.field.value, result: "ok",
      message: priceResult.outcome === "replaced_manual"
        ? "Preço atualizado pela consulta; a correção manual anterior (sem trava) foi substituída."
        : "Preço atualizado pela consulta." });
  } else if (priceResult.outcome === "unchanged") {
    events.push({ ...base, at, type: "preco", field: "price", from: priceResult.previous, to: priceResult.previous, result: "ok", message: "Preço confirmado, sem alteração." });
  } else if (priceResult.outcome === "held") {
    events.push({ ...base, at, type: "importacao", field: "price", from: priceResult.previous, to: reading.price, result: "pendente",
      message: "Preço travado por correção manual: novo valor guardado para revisão." });
  }

  for (const key of ["availability", "sellerName", "listingTitle", "variationLabel"] as const) {
    const incoming = reading[key];
    if (incoming === undefined) continue;
    const field = next.fields[key] as typeof next.fields.sellerName;
    const res = applyAutoValue(field, incoming as string | null, source, at);
    (next.fields as unknown as Record<string, unknown>)[key] = res.field;
    if (res.outcome === "applied" || res.outcome === "replaced_manual") {
      if (key === "sellerName" && res.previous != null) next.sellerChangedAt = at;
      if (key === "variationLabel" && res.previous != null) next.variationChangedAt = at;
      events.push({ ...base, at, type: "importacao", field: key, from: res.previous, to: res.field.value, result: "ok",
        message: res.outcome === "replaced_manual" ? `Campo ${key} atualizado; correção manual sem trava substituída.` : `Campo ${key} atualizado pela consulta.` });
    } else if (res.outcome === "held") {
      events.push({ ...base, at, type: "importacao", field: key, from: res.previous, to: incoming, result: "pendente",
        message: `Campo ${key} travado: novo valor aguardando revisão.` });
    }
  }
  if (reading.linkStatus) next.linkStatus = reading.linkStatus;
  if (reading.imageStatus) next.imageStatus = reading.imageStatus;

  next.lastCheckedAt = at;
  next.lastSuccessAt = at;
  next.consecutiveFailures = 0;
  next.lastError = null;
  next.updatedAt = at;
  return { offer: next, events };
}

/** Falha: o preço anterior NÃO é alterado (nunca vira zero). */
export function applyFailure(offer: AdminOffer, error: string, at: string) {
  const next: AdminOffer = { ...offer, lastCheckedAt: at, consecutiveFailures: offer.consecutiveFailures + 1, lastError: error, updatedAt: at };
  const event: Omit<HistoryEvent, "id"> = {
    entity: "offer", entityId: offer.id, productId: offer.productId, offerId: offer.id, actor: "automação", demo: offer.demo,
    at, type: "verificacao", result: "falha", message: `Consulta falhou: ${error}. Preço anterior mantido (${offer.fields.price.value ?? "sem preço"}).`,
  };
  return { offer: next, event };
}

/** Regra configurável por loja: oculta ofertas sem atualização há mais que o limite. */
export function applyStaleRule(db: AdminDb, now: Date): { db: AdminDb; events: Omit<HistoryEvent, "id">[] } {
  const events: Omit<HistoryEvent, "id">[] = [];
  const storeById = new Map(db.stores.map((s) => [s.id, s]));
  const at = now.toISOString();
  const offers = db.offers.map((o) => {
    const store = storeById.get(o.storeId);
    if (!store || store.hideStaleAfterHours == null || o.hidden) return o;
    const age = o.lastSuccessAt ? (now.getTime() - new Date(o.lastSuccessAt).getTime()) / 3600_000 : Infinity;
    if (age <= store.hideStaleAfterHours) return o;
    events.push({ entity: "offer", entityId: o.id, productId: o.productId, offerId: o.id, actor: "sistema", demo: o.demo, at,
      type: "status", result: "ok", message: `Oferta ocultada: sem atualização há mais de ${store.hideStaleAfterHours} h (regra da loja ${store.name}).` });
    return { ...o, hidden: { reason: `Desatualizada há mais de ${store.hideStaleAfterHours} h (regra da loja)`, by: "sistema", at } };
  });
  return { db: { ...db, offers }, events };
}

export function isDue(offer: AdminOffer, store: StoreConfig, now: Date) {
  if (!offer.lastCheckedAt) return true;
  return now.getTime() - new Date(offer.lastCheckedAt).getTime() >= store.frequencyHours * 3600_000;
}

/**
 * Executa verificações. `offerIds` limita a ofertas específicas ("Verificar agora");
 * sem ele, consulta as ofertas vencidas conforme a frequência de cada loja.
 */
export async function runChecks(
  db: AdminDb,
  { trigger, offerIds, now = new Date() }: { trigger: CheckRun["trigger"]; offerIds?: string[]; now?: Date },
): Promise<{ db: AdminDb; run: CheckRun }> {
  const startedAt = now.toISOString();
  const offersById = new Map(db.offers.map((o) => [o.id, o]));
  const history: HistoryEvent[] = [];
  const results: RunStoreResult[] = [];
  let consultedDemo = 0;
  let consultedReal = 0;

  for (const store of db.stores) {
    const candidates = db.offers.filter(
      (o) => o.storeId === store.id && (offerIds ? offerIds.includes(o.id) : isDue(o, store, now) && !o.hidden),
    );
    if (!candidates.length) continue;
    const real = connectorFor(store);
    const result: RunStoreResult = { storeId: store.id, consulted: 0, updated: 0, errors: 0, skipped: 0, message: "" };
    const messages = new Set<string>();

    for (const offer of candidates) {
      const connector = offer.demo && db.settings.demoMode ? demoConnector : real;
      if (!connector) {
        result.skipped++;
        messages.add(
          store.integration.kind === "somente_manual"
            ? "Loja sem fonte de dados autorizada: atualização somente manual."
            : "Integração pendente de configuração: nenhuma consulta foi feita.",
        );
        history.push({ id: newHistoryId(), at: startedAt, entity: "offer", entityId: offer.id, productId: offer.productId, offerId: offer.id,
          type: "verificacao", result: "ignorado", actor: "automação", demo: offer.demo,
          message: "Verificação não executada: integração da loja pendente de configuração. Dados atuais mantidos." });
        continue;
      }
      result.consulted++;
      if (offer.demo) consultedDemo++;
      else consultedReal++;
      const attempt = db.runs.length + 1;
      const res = await connector.checkOffer(offer, store, attempt);
      if (res.ok) {
        const { offer: updated, events } = applyReading(offer, res.reading, offer.demo ? "demonstração" : `integração:${store.id}`, startedAt);
        offersById.set(offer.id, updated);
        if (events.some((e) => e.result === "ok" && e.from !== e.to)) result.updated++;
        history.push({ id: newHistoryId(), at: startedAt, entity: "offer", entityId: offer.id, productId: offer.productId, offerId: offer.id,
          type: "verificacao", result: "ok", actor: "automação", demo: offer.demo, message: `Consulta concluída (${connector.label}).` });
        for (const e of events) history.push({ id: newHistoryId(), ...e });
      } else {
        result.errors++;
        messages.add(res.error);
        const { offer: failed, event } = applyFailure(offer, res.error, startedAt);
        offersById.set(offer.id, failed);
        history.push({ id: newHistoryId(), ...event });
      }
    }
    result.message = [...messages].join(" ") || "Sem falhas.";
    results.push(result);
  }

  let next: AdminDb = { ...db, offers: db.offers.map((o) => offersById.get(o.id) ?? o), history: [...db.history, ...history] };
  const stale = applyStaleRule(next, now);
  next = { ...stale.db, history: [...stale.db.history, ...stale.events.map((e) => ({ id: newHistoryId(), ...e }))] };

  const run: CheckRun = {
    id: `run-${now.getTime().toString(36)}-${(seq++).toString(36)}`,
    trigger,
    startedAt,
    finishedAt: new Date().toISOString(),
    demo: consultedDemo > 0 && consultedReal === 0,
    stores: results,
  };
  return { db: { ...next, runs: [run, ...next.runs].slice(0, 200) }, run };
}
