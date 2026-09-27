import type { ComparatorItem } from "@/lib/comparator/types";

import type { ProductSnapshot } from "./types";

/**
 * Normaliza o termo buscado e descarta o que pode ser dado pessoal
 * (e-mail, telefone, CPF): esses termos não são gravados.
 */
export function sanitizeQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
  if (q.length < 2) return null;
  if (/@|\d{6,}|\d{3}[.\s-]\d{3}/.test(q)) return null;
  return q;
}

const BOT = /bot|crawler|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor|curl|wget|python-requests/i;

/** Robôs, pré-carregamentos e verificações de link não contam como acesso. */
export function isAutomated(headers: Headers): boolean {
  const ua = headers.get("user-agent") ?? "";
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""} ${headers.get("next-router-prefetch") ?? ""}`;
  return !ua || BOT.test(ua) || /prefetch|prerender|1/.test(purpose.trim());
}

export function snapshotOf(item: ComparatorItem): ProductSnapshot {
  return {
    productId: item.id,
    productName: [item.brand.name, item.title, item.flavor].filter(Boolean).join(" · "),
    brand: item.brand.name,
    species: item.species,
    kind: item.kind,
    sizes: item.species === "caes" ? (item.sizes ?? []) : [],
    weightGrams: item.netWeightGrams,
  };
}

export const FILTER_DIMENSIONS = ["especie", "marca", "idade", "porte", "tipo", "indicacao", "sabor", "peso"] as const;
