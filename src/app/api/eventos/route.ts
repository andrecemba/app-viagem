import { NextResponse, type NextRequest } from "next/server";

import { findCatalogProduct, getCatalog } from "@/lib/data";
import { FILTER_DIMENSIONS, isAutomated, sanitizeQuery, snapshotOf } from "@/lib/analytics/sanitize";
import { rateLimited, recordEvent } from "@/lib/analytics/store";
import type { AnalyticsEvent } from "@/lib/analytics/types";

/**
 * Recebe eventos do site (busca, filtro, visita a produto) via navigator.sendBeacon.
 * O servidor confere cada valor contra o catálogo: o navegador não decide o que é gravado.
 * Cliques para as lojas são registrados em /ir/<oferta>, não aqui.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (isAutomated(request.headers) || rateLimited(ip)) return new NextResponse(null, { status: 204 });

  const raw = await request.text();
  if (raw.length > 2000) return new NextResponse(null, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const at = new Date().toISOString();
  let event: AnalyticsEvent | null = null;

  if (body.type === "busca") {
    const q = sanitizeQuery(body.q);
    const results = Number(body.results);
    if (q && Number.isInteger(results) && results >= 0) event = { at, type: "busca", q, results: Math.min(results, 100000) };
  } else if (body.type === "filtro" && typeof body.dim === "string" && typeof body.value === "string") {
    const dim = body.dim as (typeof FILTER_DIMENSIONS)[number];
    if (FILTER_DIMENSIONS.includes(dim) && body.value.length <= 60) {
      let value: string | null = body.value;
      if (dim === "marca") value = (await getCatalog()).find((i) => i.brand.slug === body.value)?.brand.name ?? null;
      if (value) event = { at, type: "filtro", dim, value };
    }
  } else if (body.type === "produto" && typeof body.id === "string") {
    const item = await findCatalogProduct(body.id);
    if (item) event = { at, type: "produto", ...snapshotOf(item) };
  }

  if (!event) return new NextResponse(null, { status: 400 });
  await recordEvent(event);
  return new NextResponse(null, { status: 204 });
}
