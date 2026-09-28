import { parseJson, type Db } from "@/lib/db/util";

import type { Settings } from "./types";
import { ValidationError } from "./validation";

export const DEFAULT_SETTINGS: Settings = { staleHours: 48, shippingQuoteHours: 6, conversionRate: null, commission: {} };

export function getSettings(db: Db): Settings {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, parseJson<unknown>(r.value, null)]));
  return {
    staleHours: typeof map.staleHours === "number" ? map.staleHours : DEFAULT_SETTINGS.staleHours,
    shippingQuoteHours: typeof map.shippingQuoteHours === "number" ? map.shippingQuoteHours : DEFAULT_SETTINGS.shippingQuoteHours,
    conversionRate: typeof map.conversionRate === "number" ? map.conversionRate : null,
    commission: (map.commission as Settings["commission"]) ?? {},
  };
}

export function saveSettings(db: Db, patch: Partial<Settings>) {
  if (patch.staleHours != null && (!Number.isInteger(patch.staleHours) || patch.staleHours < 1 || patch.staleHours > 24 * 30)) {
    throw new ValidationError("O prazo de atualização deve ficar entre 1 e 720 horas.");
  }
  if (patch.shippingQuoteHours != null && (!Number.isInteger(patch.shippingQuoteHours) || patch.shippingQuoteHours < 1 || patch.shippingQuoteHours > 48)) {
    throw new ValidationError("A validade da cotação de frete deve ficar entre 1 e 48 horas.");
  }
  const bad = (v: number | null | undefined) => v != null && (!Number.isFinite(v) || v < 0 || v > 1);
  if (bad(patch.conversionRate)) throw new ValidationError("Conversão deve ficar entre 0% e 100%.");
  for (const v of Object.values(patch.commission ?? {})) if (bad(v)) throw new ValidationError("Comissão deve ficar entre 0% e 100%.");
  const put = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value");
  db.transaction(() => {
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) put.run(k, JSON.stringify(v));
  })();
}
