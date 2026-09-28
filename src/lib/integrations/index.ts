import type { Db } from "@/lib/db/util";
import type { Store } from "@/lib/domain/types";

import { createAmazonSource } from "./adapters/amazon";
import { csvFeedSource, manualSource } from "./adapters/manual";
import { createMercadoLivreSource } from "./adapters/mercado-livre";
import { createShopeeSource } from "./adapters/shopee";
import type { OfferSource } from "./types";

/** Adaptadores disponíveis. Nova loja com API = novo arquivo em adapters/ + uma linha aqui. */
export const ADAPTER_IDS = ["mercado-livre", "shopee", "amazon", "csv"] as const;

const globalForSources = globalThis as unknown as { offerSources?: Map<string, OfferSource> };

function tokenStore(db: Db | null) {
  return {
    get: () => (db?.prepare("SELECT value FROM settings WHERE key = 'ml_refresh_token'").get() as { value: string } | undefined)?.value ?? null,
    set: (v: string) => db?.prepare("INSERT INTO settings (key, value) VALUES ('ml_refresh_token', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(v),
  };
}

export function sources(db: Db | null = null): Map<string, OfferSource> {
  if (globalForSources.offerSources) return globalForSources.offerSources;
  const env = process.env;
  const map = new Map<string, OfferSource>([
    ["mercado-livre", createMercadoLivreSource({ env, tokenStore: tokenStore(db) })],
    ["shopee", createShopeeSource({ env })],
    ["amazon", createAmazonSource({ env })],
    ["csv", csvFeedSource],
    ["manual", manualSource],
  ]);
  globalForSources.offerSources = map;
  return map;
}

/** Fonte usada por uma loja: o adaptador escolhido ou, sem ele, o cadastro manual. */
export function sourceForStore(store: Pick<Store, "adapter" | "mode">, db: Db | null = null): OfferSource {
  const all = sources(db);
  return (store.mode !== "manual" && store.adapter && all.get(store.adapter)) || all.get("manual")!;
}

export type { OfferSource } from "./types";
