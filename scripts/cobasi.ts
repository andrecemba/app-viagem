/**
 * Cobasi pela linha de comando (a loja não tem API de preços para afiliados).
 *   npm run cobasi:links            rações do site que estão no Mercado Livre e ainda não têm oferta da Cobasi
 *   npm run cobasi:links -- todos   todas as rações do site sem oferta da Cobasi
 * Procura cada ração na busca pública do site da Cobasi (pelo código de barras e,
 * sem ele, pelo nome) e gera uma página com os links para colar os de afiliado.
 * Só lê a busca pública, com calma (uma consulta por vez); nada é gravado no site.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getDb } from "../src/lib/db";
import { listProducts, productName } from "../src/lib/domain/products";
import { pickVtexMatch, productRow, storeLinksPage, type StoreLinkEntry, type VtexProduct } from "../src/lib/integrations/store-links";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const BASE = "https://www.cobasi.com.br";
const SEARCH = `${BASE}/api/catalog_system/pub/products/search`;

let failures = 0;
let answered = 0;

async function search(query: string): Promise<VtexProduct[] | null> {
  if (failures >= 3 && !answered) return null; // a busca não responde deste computador: não insiste
  await new Promise((r) => setTimeout(r, 400));
  try {
    const res = await fetch(`${SEARCH}?${query}`, {
      headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok && res.status !== 206) {
      failures++;
      return null;
    }
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      failures++;
      return null;
    }
    answered++;
    return data as VtexProduct[];
  } catch {
    failures++;
    return null;
  }
}

async function main() {
  const all = process.argv[2] === "todos";
  const db = getDb();
  const withOffers = (store: string) =>
    new Set((db.prepare("SELECT DISTINCT product_id FROM offers WHERE store_id = ? AND active = 1").all(store) as { product_id: number }[]).map((r) => r.product_id));
  const onCobasi = withOffers("cobasi");
  const onMl = withOffers("mercado-livre");
  const products = listProducts(db, { onlyActive: true }).filter((p) => !p.isDemo && !onCobasi.has(p.id) && (all || onMl.has(p.id)));

  if (!products.length) {
    console.log("\nNenhuma ração para procurar (todas já têm oferta da Cobasi).");
    return;
  }
  console.log(`\nProcurando ${products.length} rações na Cobasi. Leva alguns minutos…\n`);

  const entries: StoreLinkEntry[] = [];
  let sure = 0;
  let byName = 0;
  for (const [n, p] of products.entries()) {
    const name = productName(p);
    const species = p.species === "caes" ? "cães" : "gatos";
    let results: VtexProduct[] = [];
    if (p.gtin) results = (await search(`fq=alternateIds_Ean:${encodeURIComponent(p.gtin)}`)) ?? [];
    let match = pickVtexMatch(p, results);
    // Pelo nome: do mais completo ao mais curto (a busca exige todas as palavras).
    for (const q of [`ração ${p.brand} ${p.line ?? ""} ${species} ${p.indication}`, `ração ${p.brand} ${p.line ?? ""} ${species}`, `ração ${p.brand} ${species}`]) {
      if (match) break;
      const found = await search(`ft=${encodeURIComponent(q.replace(/\s+/g, " ").trim())}&_from=0&_to=49`);
      if (found) match = pickVtexMatch(p, found);
    }
    if (match?.sure) sure++;
    else if (match) byName++;
    entries.push({
      name,
      imageUrl: match?.imageUrl ?? p.imageUrl,
      row: productRow(p, name),
      match,
      searchUrl: `${BASE}/pesquisa?terms=${encodeURIComponent(`${p.brand} ${p.line ?? ""} ${species} ${p.indication}`.replace(/\s+/g, " ").trim())}`,
    });
    console.log(`   [${n + 1}/${products.length}] ${name}  → ${!match ? "não achei (buscar na mão)" : match.sure ? "achado pelo código de barras" : "achado pelo nome (confira)"}`);
  }

  const dir = path.join(process.cwd(), "catalogo-cobasi");
  mkdirSync(dir, { recursive: true });
  const html = path.join(dir, "cobasi.html");
  writeFileSync(html, storeLinksPage("Cobasi", entries, "cobasi-com-links.csv"));

  if (!answered) {
    console.log("\nA busca da Cobasi não respondeu deste computador (pode estar bloqueando consultas automáticas).");
    console.log("A página foi gerada mesmo assim, com o botão “Buscar na Cobasi” de cada ração para achar o link na mão.");
  }
  console.log(`\nAchadas pelo código de barras: ${sure}`);
  console.log(`Achadas pelo nome (confira): ${byName}`);
  console.log(`Para buscar na mão: ${entries.length - sure - byName}`);
  console.log(`\nAbra a página: ${html}\n`);
}

main();
