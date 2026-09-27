import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { evaluateAlerts } from "./alerts";
import { createInitialDb } from "./seed";
import type { AdminDb } from "./types";

/**
 * Armazenamento da área administrativa.
 *
 * Implementação atual: um arquivo JSON no servidor (padrão `.data/admin-db.json`,
 * fora de `public/` e ignorado pelo git). Serve para desenvolvimento e para um
 * único servidor com disco persistente. NÃO serve para hospedagem serverless
 * (disco efêmero) nem para vários servidores: nesse caso, implementar
 * `AdminRepository` com Postgres/Supabase (ver docs/ADMIN.md).
 */
export interface AdminRepository {
  read(): Promise<AdminDb>;
  /** Aplica uma alteração de forma serializada e reavalia os alertas. */
  update(mutate: (db: AdminDb) => AdminDb | Promise<AdminDb>): Promise<AdminDb>;
}

function dataFile() {
  const dir = process.env.ADMIN_DATA_DIR ?? path.join(process.cwd(), ".data");
  return path.join(dir, "admin-db.json");
}

class JsonFileRepository implements AdminRepository {
  private queue: Promise<unknown> = Promise.resolve();

  async read(): Promise<AdminDb> {
    const file = dataFile();
    try {
      return JSON.parse(await readFile(file, "utf8")) as AdminDb;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const initial = evaluateAlerts(createInitialDb());
      await this.write(initial);
      return initial;
    }
  }

  private async write(db: AdminDb) {
    const file = dataFile();
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(db, null, 1), "utf8");
    await rename(tmp, file); // troca atômica: um erro no meio não corrompe o arquivo
  }

  update(mutate: (db: AdminDb) => AdminDb | Promise<AdminDb>): Promise<AdminDb> {
    const task = this.queue.then(async () => {
      const current = await this.read();
      const next = evaluateAlerts(await mutate(current));
      await this.write(next);
      return next;
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
}

const globalForRepo = globalThis as unknown as { adminRepo?: AdminRepository };
export const adminRepo: AdminRepository = globalForRepo.adminRepo ?? (globalForRepo.adminRepo = new JsonFileRepository());
