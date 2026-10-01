import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";

// O node:sqlite ainda se diz "experimental" e avisa no terminal toda vez. O aviso não
// indica problema e confunde quem está só rodando o site: filtramos só essa mensagem.
const originalEmitWarning = process.emitWarning;
process.emitWarning = function (warning: string | Error, ...rest: unknown[]) {
  const text = typeof warning === "string" ? warning : warning?.message;
  if (typeof text === "string" && text.includes("SQLite is an experimental feature")) return;
  return (originalEmitWarning as (...a: unknown[]) => void).call(process, warning, ...rest);
} as typeof process.emitWarning;

const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
type DatabaseSync = DatabaseSyncType;

/**
 * SQLite embutido no próprio Node.js (node:sqlite, Node 22.13 ou mais novo).
 * Nada para compilar na instalação — funciona igual em Windows, Mac e Linux.
 *
 * Camada fina com a mesma forma usada no projeto: prepare().run/get/all,
 * exec, pragma e transaction (com transações aninhadas por SAVEPOINT).
 */

type Value = string | number | bigint | null | Uint8Array;

/** undefined → null; true/false → 1/0 (o SQLite não tem booleano). */
function bindValue(v: unknown): Value {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  return v as Value;
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

export class Statement {
  private readonly names: Set<string>;
  constructor(
    private readonly stmt: ReturnType<DatabaseSync["prepare"]>,
    sql: string,
  ) {
    this.names = new Set([...sql.matchAll(/[@:$]([A-Za-z_]\w*)/g)].map((m) => m[1]));
  }

  private args(params: unknown[]): Value[] | [Record<string, Value>] {
    if (params.length === 1 && params[0] !== null && typeof params[0] === "object" && !(params[0] instanceof Uint8Array)) {
      // Parâmetros nomeados: só os que aparecem no SQL (o node:sqlite recusa chaves a mais).
      const obj: Record<string, Value> = {};
      for (const [k, v] of Object.entries(params[0] as Record<string, unknown>)) if (this.names.has(k)) obj[k] = bindValue(v);
      return [obj];
    }
    return params.map(bindValue);
  }

  run(...params: unknown[]): RunResult {
    const r = (this.stmt.run as (...a: unknown[]) => { changes: number | bigint; lastInsertRowid: number | bigint })(...this.args(params));
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  }

  get(...params: unknown[]): unknown {
    return (this.stmt.get as (...a: unknown[]) => unknown)(...this.args(params));
  }

  all(...params: unknown[]): unknown[] {
    return (this.stmt.all as (...a: unknown[]) => unknown[])(...this.args(params));
  }
}

export class SqliteDb {
  private readonly raw: DatabaseSync;
  private depth = 0;
  private readonly cache = new Map<string, Statement>();

  constructor(file: string) {
    this.raw = new DatabaseSync(file);
  }

  prepare(sql: string): Statement {
    let s = this.cache.get(sql);
    if (!s) {
      s = new Statement(this.raw.prepare(sql), sql);
      if (this.cache.size < 500) this.cache.set(sql, s);
    }
    return s;
  }

  exec(sql: string) {
    this.raw.exec(sql);
  }

  pragma(p: string) {
    this.raw.exec(`PRAGMA ${p}`);
  }

  /** Devolve uma função que roda `fn` dentro de uma transação. */
  transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
    return (...args: A) => {
      const outer = this.depth === 0;
      const sp = `sp${this.depth}`;
      this.raw.exec(outer ? "BEGIN" : `SAVEPOINT ${sp}`);
      this.depth++;
      try {
        const result = fn(...args);
        this.depth--;
        this.raw.exec(outer ? "COMMIT" : `RELEASE ${sp}`);
        return result;
      } catch (e) {
        this.depth--;
        this.raw.exec(outer ? "ROLLBACK" : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
        throw e;
      }
    };
  }

  close() {
    this.raw.close();
  }
}
