import type { Db } from "@/lib/db/util";
import { applySyncFailure, applySyncResult, listOffers } from "@/lib/domain/offers";
import type { Availability } from "@/lib/domain/types";

/**
 * Importação de arquivo CSV ou feed autorizado (Petz, Cobasi, Petlove ou outra loja).
 * Atualiza só ofertas já cadastradas (pelo ID do anúncio): ligar anúncio a
 * produto continua sendo decisão do admin, para não comparar rações diferentes.
 *
 * Colunas (cabeçalho obrigatório; separador vírgula ou ponto e vírgula):
 *   id_anuncio, preco, disponivel, titulo, frete_gratis
 */

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"' && quoted) {
        cur += '"';
        i++;
      } else if (c === '"') quoted = !quoted;
      else if (c === sep && !quoted) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };
  const header = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [header[i] ?? `col${i}`, v])));
}

function parsePrice(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function parseBool(v: string | undefined): boolean | null {
  const s = (v ?? "").trim().toLowerCase();
  if (["1", "sim", "s", "true", "yes"].includes(s)) return true;
  if (["0", "nao", "não", "n", "false", "no"].includes(s)) return false;
  return null;
}

export interface CsvImportReport {
  rows: number;
  updated: number;
  errors: { line: number; message: string }[];
  unknownIds: string[];
}

export function importOffersCsv(db: Db, storeId: string, text: string): CsvImportReport {
  const rows = parseCsv(text);
  const report: CsvImportReport = { rows: rows.length, updated: 0, errors: [], unknownIds: [] };
  if (rows.length && !("id_anuncio" in rows[0])) {
    report.errors.push({ line: 1, message: "Cabeçalho sem a coluna id_anuncio." });
    return report;
  }
  const offers = new Map(listOffers(db, { storeId }).filter((o) => o.externalId).map((o) => [o.externalId!, o]));
  const at = new Date().toISOString();
  rows.forEach((row, i) => {
    const line = i + 2;
    const offer = offers.get(row.id_anuncio);
    if (!offer) {
      if (row.id_anuncio) report.unknownIds.push(row.id_anuncio);
      return;
    }
    const price = parsePrice(row.preco);
    const available = parseBool(row.disponivel);
    if (!price && available !== false) {
      report.errors.push({ line, message: `Preço inválido para ${row.id_anuncio}: “${row.preco ?? ""}”.` });
      applySyncFailure(db, offer.id, `Arquivo: preço inválido (linha ${line}).`, "feed:csv");
      return;
    }
    const availability: Availability = available == null ? "desconhecida" : available ? "disponivel" : "indisponivel";
    applySyncResult(db, offer.id, {
      price,
      availability,
      freeShipping: parseBool(row.frete_gratis),
      listingTitle: row.titulo || null,
      listingWeightGrams: null,
      imageUrl: null,
      obtainedAt: at,
      source: "feed:csv",
    });
    report.updated++;
  });
  return report;
}
