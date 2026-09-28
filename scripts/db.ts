/**
 * Banco de dados pela linha de comando.
 *   npm run db:migrate      aplica migrações pendentes (e cria o cadastro inicial se o banco estiver vazio)
 *   npm run db:reset        apaga o banco local e recria com o cadastro inicial e os exemplos
 *   npm run db:sem-exemplos remove produtos e ofertas de exemplo
 *   npm run precos:atualizar  roda a atualização programada de preços (o mesmo que /api/cron/precos)
 */
import { rmSync } from "node:fs";

import { databasePath, getDb, migrate, openDb } from "../src/lib/db";
import { removeDemo } from "../src/lib/db/seed";
import { syncAll } from "../src/lib/integrations/sync";

const cmd = process.argv[2];

async function main() {
  switch (cmd) {
    case "migrate": {
      const db = openDb();
      const applied = migrate(db);
      db.close();
      getDb();
      console.log(applied.length ? `Migrações aplicadas: ${applied.join(", ")}` : "Banco já atualizado.");
      break;
    }
    case "reset": {
      for (const f of [databasePath(), `${databasePath()}-wal`, `${databasePath()}-shm`]) rmSync(f, { force: true });
      const db = getDb();
      const count = (db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n;
      console.log(`Banco recriado em ${databasePath()} com ${count} produtos.`);
      break;
    }
    case "sem-exemplos":
      removeDemo(getDb());
      console.log("Produtos e ofertas de exemplo removidos.");
      break;
    case "sync": {
      const reports = await syncAll(getDb(), "linha de comando");
      for (const r of reports) console.log(`${r.storeId}: ${r.skipped ?? `${r.checked} consultadas, ${r.updated} atualizadas, ${r.failed} com erro`}`);
      break;
    }
    default:
      console.log("Uso: tsx scripts/db.ts migrate | reset | sem-exemplos | sync");
      process.exitCode = 1;
  }
}

main();
