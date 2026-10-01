import { nowIso, parseJson, type Db } from "@/lib/db/util";

import type { PriceDisplay, Store, StoreMode } from "./types";
import { hostOf, slugify, ValidationError } from "./validation";

interface StoreRow {
  id: string;
  name: string;
  domains: string;
  affiliate_domains: string;
  mode: StoreMode;
  adapter: string | null;
  price_display: PriceDisplay;
  color: string;
  logo_url: string | null;
  active: number;
  created_at: string;
}

function toStore(r: StoreRow): Store {
  return {
    id: r.id,
    name: r.name,
    domains: parseJson(r.domains, []),
    affiliateDomains: parseJson(r.affiliate_domains, []),
    mode: r.mode,
    adapter: r.adapter,
    priceDisplay: r.price_display,
    color: r.color,
    logoUrl: r.logo_url,
    active: Boolean(r.active),
    createdAt: r.created_at,
  };
}

export function listStores(db: Db, opts: { onlyActive?: boolean } = {}): Store[] {
  const rows = db.prepare(`SELECT * FROM stores ${opts.onlyActive ? "WHERE active = 1" : ""} ORDER BY rowid`).all() as StoreRow[];
  return rows.map(toStore);
}

export function getStore(db: Db, id: string): Store | null {
  const r = db.prepare("SELECT * FROM stores WHERE id = ?").get(id) as StoreRow | undefined;
  return r ? toStore(r) : null;
}

export interface StoreInput {
  id?: string;
  name: string;
  domains: string[];
  affiliateDomains: string[];
  mode: StoreMode;
  adapter: string | null;
  priceDisplay: PriceDisplay;
  color: string;
  logoUrl: string | null;
  active: boolean;
}

function cleanDomain(d: string) {
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

export function saveStore(db: Db, input: StoreInput, isNew: boolean): Store {
  const name = input.name.trim();
  if (name.length < 2) throw new ValidationError("Informe o nome da loja.");
  const id = isNew ? slugify(input.id?.trim() || name) : input.id!;
  if (!id) throw new ValidationError("Identificador da loja inválido.");
  const domains = [...new Set(input.domains.map(cleanDomain).filter(Boolean))];
  const affiliateDomains = [...new Set(input.affiliateDomains.map(cleanDomain).filter(Boolean))];
  if (!domains.length) throw new ValidationError("Informe pelo menos um domínio da loja (ex.: loja.com.br).");
  for (const d of [...domains, ...affiliateDomains]) {
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) throw new ValidationError(`Domínio inválido: ${d}`);
  }
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) throw new ValidationError("Cor inválida: use o formato #1a2b3c.");
  if (input.logoUrl && !hostOf(input.logoUrl)) throw new ValidationError("O logo precisa ser um endereço https://.");
  if (input.mode === "api" && !input.adapter) throw new ValidationError("Para ofertas por API, escolha o adaptador de integração.");
  if (isNew && getStore(db, id)) throw new ValidationError(`Já existe uma loja com o identificador “${id}”.`);

  const values = {
    id,
    name,
    domains: JSON.stringify(domains),
    affiliate_domains: JSON.stringify(affiliateDomains),
    mode: input.mode,
    adapter: input.mode === "manual" ? null : input.adapter,
    price_display: input.priceDisplay,
    color: input.color.toLowerCase(),
    logo_url: input.logoUrl,
    active: input.active ? 1 : 0,
  };
  if (isNew) {
    db.prepare(
      `INSERT INTO stores (id, name, domains, affiliate_domains, mode, adapter, price_display, color, logo_url, active, created_at)
       VALUES (@id, @name, @domains, @affiliate_domains, @mode, @adapter, @price_display, @color, @logo_url, @active, @created_at)`,
    ).run({ ...values, created_at: nowIso() });
  } else {
    const r = db
      .prepare(
        `UPDATE stores SET name = @name, domains = @domains, affiliate_domains = @affiliate_domains, mode = @mode, adapter = @adapter,
         price_display = @price_display, color = @color, logo_url = @logo_url, active = @active WHERE id = @id`,
      )
      .run(values);
    if (!r.changes) throw new ValidationError("Loja não encontrada.");
  }
  return getStore(db, id)!;
}
