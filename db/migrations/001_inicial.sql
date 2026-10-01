-- Modelo inicial. Produto = a ração exata; oferta = o anúncio dessa ração numa loja.

CREATE TABLE stores (
  id                TEXT PRIMARY KEY,                -- slug: "mercado-livre"
  name              TEXT NOT NULL,
  domains           TEXT NOT NULL DEFAULT '[]',      -- JSON: domínios aceitos para a URL do anúncio
  affiliate_domains TEXT NOT NULL DEFAULT '[]',      -- JSON: domínios extras aceitos só no link de afiliado (encurtadores do programa)
  mode              TEXT NOT NULL CHECK (mode IN ('manual', 'feed', 'api')),
  adapter           TEXT,                            -- adaptador de integração (src/lib/integrations)
  price_display     TEXT NOT NULL DEFAULT 'sempre' CHECK (price_display IN ('sempre', 'somente_api')),
  color             TEXT NOT NULL DEFAULT '#6b7280',
  logo_url          TEXT,
  active            INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL
);

CREATE TABLE products (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  identity_key  TEXT NOT NULL UNIQUE,               -- espécie|marca|linha|indicação|sabor|peso|castrado normalizados
  species       TEXT NOT NULL CHECK (species IN ('caes', 'gatos')),
  brand         TEXT NOT NULL,
  line          TEXT,
  indication    TEXT NOT NULL,                      -- "Adultos Raças Médias", "Filhotes", "Adultos Castrados"
  flavor        TEXT,
  weight_grams  INTEGER NOT NULL CHECK (weight_grams > 0),
  unit_count    INTEGER,
  neutered      INTEGER NOT NULL DEFAULT 0,         -- versão para castrados = produto próprio
  life_stage    TEXT,
  size          TEXT,
  food_type     TEXT,
  needs         TEXT NOT NULL DEFAULT '[]',
  gtin          TEXT,
  image_url     TEXT,
  description   TEXT,
  sources       TEXT NOT NULL DEFAULT '[]',
  notes         TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  is_demo       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX products_brand ON products (brand);
CREATE INDEX products_gtin ON products (gtin);

CREATE TABLE offers (
  id                    INTEGER PRIMARY KEY,
  product_id            INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  store_id              TEXT NOT NULL REFERENCES stores (id),
  external_id           TEXT,
  data_source           TEXT NOT NULL CHECK (data_source IN ('manual', 'feed', 'api')),
  -- Valores automáticos (ou do cadastro manual). Correções do admin ficam em offer_overrides.
  url                   TEXT NOT NULL,
  affiliate_url         TEXT,
  price                 REAL,
  currency              TEXT NOT NULL DEFAULT 'BRL',
  price_obtained_at     TEXT,
  price_source          TEXT,
  previous_price        REAL,
  previous_price_at     TEXT,
  availability          TEXT NOT NULL DEFAULT 'desconhecida' CHECK (availability IN ('disponivel', 'indisponivel', 'desconhecida')),
  free_shipping         INTEGER,                    -- indicação geral do anúncio (1/0/NULL = desconhecido); não é cotação
  listing_title         TEXT,
  listing_weight_grams  INTEGER,
  listing_flavor        TEXT,
  image_url             TEXT,
  notes                 TEXT,
  match_status          TEXT NOT NULL DEFAULT 'confirmada' CHECK (match_status IN ('confirmada', 'incerta')),
  active                INTEGER NOT NULL DEFAULT 1,
  is_demo               INTEGER NOT NULL DEFAULT 0,
  last_checked_at       TEXT,
  last_sync_status      TEXT CHECK (last_sync_status IN ('ok', 'erro')),
  last_sync_error       TEXT,
  consecutive_failures  INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);
CREATE INDEX offers_product ON offers (product_id);
CREATE UNIQUE INDEX offers_store_external ON offers (store_id, external_id) WHERE external_id IS NOT NULL;

-- Correção manual de um campo importado: vence a sincronização até o admin "voltar ao automático".
CREATE TABLE offer_overrides (
  offer_id    INTEGER NOT NULL REFERENCES offers (id) ON DELETE CASCADE,
  field       TEXT NOT NULL,
  value       TEXT,                                  -- JSON
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  note        TEXT,
  PRIMARY KEY (offer_id, field)
);

CREATE TABLE offer_events (
  id            INTEGER PRIMARY KEY,
  offer_id      INTEGER NOT NULL REFERENCES offers (id) ON DELETE CASCADE,
  at            TEXT NOT NULL,
  kind          TEXT NOT NULL,                       -- criacao, edicao, sincronizacao, erro, correcao, volta_automatico, importacao
  actor         TEXT NOT NULL,
  price         REAL,
  availability  TEXT,
  message       TEXT
);
CREATE INDEX offer_events_offer ON offer_events (offer_id, at);

-- Frete cotado para um CEP (curta validade). Diferente de offers.free_shipping.
CREATE TABLE shipping_quotes (
  id             INTEGER PRIMARY KEY,
  offer_id       INTEGER NOT NULL REFERENCES offers (id) ON DELETE CASCADE,
  cep            TEXT NOT NULL,
  cost           REAL NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'BRL',
  deadline_days  INTEGER,
  quoted_at      TEXT NOT NULL,
  expires_at     TEXT NOT NULL,
  source         TEXT NOT NULL
);
CREATE INDEX shipping_quotes_lookup ON shipping_quotes (offer_id, cep, expires_at);

CREATE TABLE sync_runs (
  id           INTEGER PRIMARY KEY,
  store_id     TEXT NOT NULL,
  trigger      TEXT NOT NULL,
  started_at   TEXT NOT NULL,
  finished_at  TEXT,
  checked      INTEGER NOT NULL DEFAULT 0,
  updated      INTEGER NOT NULL DEFAULT 0,
  failed       INTEGER NOT NULL DEFAULT 0,
  message      TEXT
);

CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

-- Uso do site, sem dados pessoais.
CREATE TABLE analytics_events (
  id       INTEGER PRIMARY KEY,
  at       TEXT NOT NULL,
  type     TEXT NOT NULL,
  is_demo  INTEGER NOT NULL DEFAULT 0,
  data     TEXT NOT NULL
);
CREATE INDEX analytics_events_at ON analytics_events (is_demo, at);

-- Pedidos de "Avisar oferta" (e-mail: dado pessoal, só no servidor).
CREATE TABLE price_alert_requests (
  id                INTEGER PRIMARY KEY,
  at                TEXT NOT NULL,
  email             TEXT NOT NULL,
  product_id        INTEGER REFERENCES products (id) ON DELETE SET NULL,
  price_at_request  REAL,
  target_price      REAL
);
