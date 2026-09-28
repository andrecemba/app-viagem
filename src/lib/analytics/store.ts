import type { Db } from "@/lib/db/util";

import type { AnalyticsEvent } from "./types";

/** Eventos de uso no banco. Dados de demonstração marcados (is_demo) e nunca misturados aos reais. */
export function recordEvent(db: Db, event: AnalyticsEvent, demo = false) {
  const { at, type, ...data } = event;
  db.prepare("INSERT INTO analytics_events (at, type, is_demo, data) VALUES (?, ?, ?, ?)").run(at, type, demo ? 1 : 0, JSON.stringify(data));
}

export function readEvents(db: Db, kind: "real" | "demo", since?: string): AnalyticsEvent[] {
  const rows = db
    .prepare("SELECT at, type, data FROM analytics_events WHERE is_demo = ? AND at >= ? ORDER BY at")
    .all(kind === "demo" ? 1 : 0, since ?? "") as { at: string; type: AnalyticsEvent["type"]; data: string }[];
  return rows.map((r) => ({ at: r.at, type: r.type, ...(JSON.parse(r.data) as object) }));
}

export function hasDemoEvents(db: Db) {
  return Boolean(db.prepare("SELECT 1 FROM analytics_events WHERE is_demo = 1 LIMIT 1").get());
}

export function writeDemoEvents(db: Db, events: AnalyticsEvent[]) {
  db.transaction(() => {
    db.prepare("DELETE FROM analytics_events WHERE is_demo = 1").run();
    for (const e of events) recordEvent(db, e, true);
  })();
}

export function removeDemoEvents(db: Db) {
  db.prepare("DELETE FROM analytics_events WHERE is_demo = 1").run();
}

/** Limite simples por IP (em memória) para os endpoints públicos. O IP não é gravado. */
const hits = new Map<string, { count: number; reset: number }>();
export function rateLimited(key: string, max = 120, windowMs = 60_000) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  h.count++;
  return h.count > max;
}
