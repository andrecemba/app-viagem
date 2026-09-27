import "server-only";

import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { adminDataDir } from "@/lib/admin/repository";

import type { AnalyticsEvent } from "./types";

/**
 * Eventos em arquivos JSON Lines (um evento por linha, só acrescentando).
 * Os dados de demonstração ficam em outro arquivo e nunca se misturam aos reais.
 * Em produção com vários servidores ou serverless, trocar por uma tabela no banco.
 */
const file = (kind: "real" | "demo") => path.join(adminDataDir(), kind === "real" ? "eventos.jsonl" : "eventos-demo.jsonl");

export async function recordEvent(event: AnalyticsEvent) {
  await mkdir(adminDataDir(), { recursive: true });
  await appendFile(file("real"), `${JSON.stringify(event)}\n`, "utf8");
}

export async function readEvents(kind: "real" | "demo", since?: string): Promise<AnalyticsEvent[]> {
  let text: string;
  try {
    text = await readFile(file(kind), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const events: AnalyticsEvent[] = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      const ev = JSON.parse(line) as AnalyticsEvent;
      if (!since || ev.at >= since) events.push(ev);
    } catch {
      // Linha incompleta (queda no meio da gravação): ignora.
    }
  }
  return events;
}

export async function hasDemoEvents() {
  return (await readEvents("demo")).length > 0;
}

export async function writeDemoEvents(events: AnalyticsEvent[]) {
  await mkdir(adminDataDir(), { recursive: true });
  await writeFile(file("demo"), events.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
}

export async function removeDemoEvents() {
  await rm(file("demo"), { force: true });
}

/** Limite simples por IP (em memória) para o endpoint de eventos. O IP não é gravado. */
const hits = new Map<string, { count: number; reset: number }>();
export function rateLimited(ip: string, max = 120, windowMs = 60_000) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { count: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  h.count++;
  return h.count > max;
}
