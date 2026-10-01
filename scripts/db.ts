/**
 * Banco de dados pela linha de comando.
 *   npm run db:migrate      aplica migrações pendentes (e cria o cadastro inicial se o banco estiver vazio)
 *   npm run db:reset        apaga o banco local e recria com o cadastro inicial e os exemplos
 *   npm run db:sem-exemplos remove produtos e ofertas de exemplo
 *   npm run db:zerar        apaga TODOS os produtos, ofertas e acessos (as lojas ficam) — pede confirmação
 *   npm run precos:atualizar  roda a atualização programada de preços (o mesmo que /api/cron/precos)
 */
import { existsSync, rmSync } from "node:fs";
import { createInterface } from "node:readline/promises";

import { databasePath, getDb, migrate, openDb } from "../src/lib/db";
import { removeDemo } from "../src/lib/db/seed";
import { syncAll } from "../src/lib/integrations/sync";

// Mesmas variáveis que o site (npm run dev) lê, para os comandos mexerem no mesmo banco.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

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
      process.env.SEED_DEMO = "1"; // reset é para ver o site com os exemplos
      for (const f of [databasePath(), `${databasePath()}-wal`, `${databasePath()}-shm`]) rmSync(f, { force: true });
      const db = getDb();
      const count = (db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n;
      console.log(`Banco recriado em ${databasePath()} com ${count} produtos.`);
      break;
    }
    case "zerar": {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      console.log("\nIsto apaga TODOS os produtos, ofertas, históricos, pedidos de aviso e acessos registrados.");
      console.log("As lojas e as configurações continuam. Não dá para desfazer.\n");
      const answer = (await rl.question('Para confirmar, digite ZERAR e aperte Enter: ')).trim();
      rl.close();
      if (answer !== "ZERAR") {
        console.log("Cancelado. Nada foi apagado.");
        break;
      }
      const db = getDb();
      const before = (db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n;
      db.transaction(() => {
        for (const t of ["offer_overrides", "offer_events", "shipping_quotes", "offers", "price_alert_requests", "analytics_events", "products", "sync_runs"]) {
          db.prepare(`DELETE FROM ${t}`).run();
        }
      })();
      console.log(`Pronto: ${before} produtos apagados de ${databasePath()}. Catálogo vazio.`);
      console.log("Se o site estiver aberto, feche (Ctrl+C) e rode npm run dev de novo. Depois cadastre pelo painel (/admin).");
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
      console.log("Uso: tsx scripts/db.ts migrate | reset | zerar | sem-exemplos | sync");
      process.exitCode = 1;
  }
}

main();
