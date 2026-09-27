import "server-only";

import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { createInitialDb } from "./seed";
import type { AdminDb } from "./types";

/**
 * Armazenamento da administração.
 *
 * Implementação atual: um arquivo JSON no servidor (padrão `.data/admin-db.json`,
 * fora de `public/` e ignorado pelo git). Serve para desenvolvimento e para um
 * único servidor com disco persistente. NÃO serve para hospedagem serverless
 * (disco efêmero): nesse caso, implementar `AdminRepository` com um banco
 * (ex.: Postgres/Supabase). Ver docs/ADMIN.md.
 */
export interface AdminRepository {
  read(): Promise<AdminDb>;
  /** Aplica uma alteração de forma serializada (uma de cada vez). */
  update(mutate: (db: AdminDb) => AdminDb | Promise<AdminDb>): Promise<AdminDb>;
}

export function adminDataDir() {
  return process.env.ADMIN_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function dataFile() {
  return path.join(adminDataDir(), "admin-db.json");
}

class JsonFileRepository implements AdminRepository {
  private queue: Promise<unknown> = Promise.resolve();

  async read(): Promise<AdminDb> {
    const file = dataFile();
    try {
      const db = JSON.parse(await readFile(file, "utf8")) as AdminDb | { version?: number };
      if (db.version === 2) return db as AdminDb;
      // Arquivo do modelo antigo: guarda uma cópia e recomeça do cadastro inicial.
      await copyFile(file, `${file}.v${db.version ?? 1}.bak`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const initial = createInitialDb();
    await this.write(initial);
    return initial;
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
      const next = await mutate(await this.read());
      await this.write(next);
      return next;
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
}

const globalForRepo = globalThis as unknown as { adminRepoV2?: AdminRepository };
export const adminRepo: AdminRepository = globalForRepo.adminRepoV2 ?? (globalForRepo.adminRepoV2 = new JsonFileRepository());
