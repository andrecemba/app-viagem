import type Database from "better-sqlite3";

export type Db = Database.Database;

export const nowIso = () => new Date().toISOString();

/** JSON seguro para colunas de texto. */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
