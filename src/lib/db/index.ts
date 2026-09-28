import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Banco SQLite (arquivo único, padrão `.data/racao.db`). Simples e real: sobrevive
 * a recarregar a página e a reiniciar o servidor. Para hospedagem sem disco
 * persistente, trocar por Postgres mantendo as mesmas consultas (ver README).
 *
 * Sem "server-only" aqui para os scripts de linha de comando poderem usar;
 * as páginas só chegam ao banco por módulos de servidor.
 */
import { ensureSeed } from "./seed";
import { SqliteDb } from "./sqlite";
import type { Db } from "./util";

export { nowIso, parseJson, type Db } from "./util";

export function databasePath() {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), ".data", "racao.db");
}

export function migrationsDir() {
  return path.join(process.cwd(), "db", "migrations");
}

/** Aplica, em ordem, as migrações .sql que ainda não rodaram. */
export function migrate(db: Db, dir = migrationsDir()): string[] {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const done = new Set(db.prepare("SELECT version FROM schema_migrations").all().map((r) => (r as { version: string }).version));
  const applied: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    const sql = readFileSync(path.join(dir, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(file, new Date().toISOString());
    })();
    applied.push(file);
  }
  return applied;
}

export function openDb(file = databasePath()): Db {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new SqliteDb(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  return db;
}

const globalForDb = globalThis as unknown as { racaoDb?: Db };

/** Conexão única do processo; migra e cria o cadastro inicial na primeira abertura. */
export function getDb(): Db {
  if (globalForDb.racaoDb) return globalForDb.racaoDb;
  const db = openDb();
  migrate(db);
  ensureSeed(db);
  globalForDb.racaoDb = db;
  return db;
}
