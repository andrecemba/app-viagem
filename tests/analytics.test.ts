import { describe, expect, it } from "vitest";

import { buildReport } from "@/lib/analytics/report";
import { isAutomated, sanitizeQuery } from "@/lib/analytics/sanitize";
import type { AnalyticsEvent } from "@/lib/analytics/types";

const NOW = new Date("2026-09-27T12:00:00-03:00");
const iso = (daysAgo = 0) => new Date(NOW.getTime() - daysAgo * 86400_000).toISOString();

describe("relatórios", () => {
  const snap = { productId: "p1", productName: "Golden · Frango", brand: "Golden", species: "caes", kind: "seca", sizes: ["medio"], weightGrams: 15000 };
  const events: AnalyticsEvent[] = [
    { at: iso(1), type: "produto", ...snap },
    { at: iso(1), type: "produto", ...snap },
    { at: iso(1), type: "clique", ...snap, store: "amazon", price: 200 },
    { at: iso(2), type: "clique", ...snap, store: "petz", price: 100 },
    { at: iso(2), type: "busca", q: "golden", results: 4 },
    { at: iso(2), type: "busca", q: "marca x", results: 0 },
    { at: iso(2), type: "filtro", dim: "peso", value: "10-15kg" },
    { at: iso(60), type: "clique", ...snap, store: "amazon", price: 999 },
  ];

  it("conta cliques, lojas, rações, buscas sem resultado e ignora fora do período", () => {
    const r = buildReport(events, { from: new Date(iso(7)), to: NOW, conversionRate: null, commission: {}, storeNames: { petz: "Petz" } });
    expect(r.totals).toMatchObject({ clicks: 2, views: 2, searches: 2, clickedValue: 300 });
    expect(r.stores.map((s) => s.store)).toEqual(["amazon", "petz"]);
    expect(r.products[0]).toMatchObject({ label: "Golden · Frango", views: 2, clicks: 2 });
    expect(r.zeroResultTerms).toEqual([{ q: "marca x", count: 1 }]);
    expect(r.weights.map((w) => w.label)).toEqual(["15 kg", "10 a 15 kg"]);
    expect(r.clicksByDay.length).toBeGreaterThanOrEqual(7);
    expect(r.estimate.total).toBeNull();
  });

  it("estima comissão só com taxas informadas", () => {
    const r = buildReport(events, { from: new Date(iso(7)), to: NOW, conversionRate: 0.1, commission: { amazon: 0.05 }, storeNames: { petz: "Petz" } });
    expect(r.stores.find((s) => s.store === "amazon")!.estimate).toBe(1);
    expect(r.stores.find((s) => s.store === "petz")!.estimate).toBeNull();
    expect(r.estimate.total).toBe(1);
    expect(r.estimate.storesWithoutRate).toEqual(["Petz"]);
  });

  it("não grava termos com cara de dado pessoal e ignora robôs", () => {
    expect(sanitizeQuery("  Golden   15KG ")).toBe("golden 15kg");
    expect(sanitizeQuery("fulano@email.com")).toBeNull();
    expect(sanitizeQuery("41 99999-8888")).toBeNull();
    expect(sanitizeQuery("123.456.789-00")).toBeNull();
    expect(isAutomated(new Headers({ "user-agent": "Googlebot/2.1" }))).toBe(true);
    expect(isAutomated(new Headers({ "user-agent": "Mozilla/5.0", "sec-purpose": "prefetch" }))).toBe(true);
    expect(isAutomated(new Headers({ "user-agent": "Mozilla/5.0 (iPhone)" }))).toBe(false);
  });
});
