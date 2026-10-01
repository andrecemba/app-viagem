/**
 * Mercado Livre pela linha de comando.
 *   npm run ml:conectar              autoriza sua conta no aplicativo e grava as chaves no .env.local
 *   npm run ml:testar -- <link|MLB…> [CEP]   consulta um anúncio pela API oficial (e o frete, se passar o CEP)
 *   npm run ml:catalogo [-- termos…]  busca rações no catálogo e gera planilhas para Produtos → Importar planilha
 *   npm run ml:mais-vendidos [-- 10]   as rações mais vendidas (cães e gatos) em planilha + página com os links
 * Tudo roda no seu computador; as chaves ficam só no .env.local (nunca vão para o navegador).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

import { getDb } from "../src/lib/db";
import { codeFromRedirect, parseMercadoLivreUrl, type MercadoLivreSource } from "../src/lib/integrations/adapters/mercado-livre";
import { redact } from "../src/lib/integrations/http";
import { IntegrationError } from "../src/lib/integrations/types";
import { FOOD_DOMAIN, catalogRow, linksPage, toCsv, type CatalogRow, type LinkEntry, type MlCatalogProduct } from "../src/lib/integrations/ml-catalog";
import { sources } from "../src/lib/integrations";

const ENV_FILE = ".env.local";
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const AUTH_URL = "https://auth.mercadolivre.com.br/authorization";
const TOKEN_URL = "https://api.mercadolibre.com/oauth/token";

function setVar(text: string, key: string, value: string) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
}

async function conectar() {
  if (!existsSync(ENV_FILE)) {
    console.log("Não achei o arquivo .env.local. Rode primeiro: npm run configurar");
    process.exitCode = 1;
    return;
  }
  // Uma única leitura do teclado para todas as perguntas (funciona também com texto colado de uma vez).
  const tty = Boolean(process.stdin.isTTY);
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: tty });
  const lines = rl[Symbol.asyncIterator]();
  // Chave secreta digitada/colada aparece como asteriscos.
  let muted = false;
  const internal = rl as unknown as { _writeToOutput?: (s: string) => void; output: NodeJS.WriteStream };
  const write = internal._writeToOutput?.bind(rl);
  if (write) internal._writeToOutput = (s: string) => (muted && !s.includes("\n") ? internal.output.write("*") : write(s));

  /**
   * Pergunta até vir uma resposta válida. Linhas vazias extras (comuns ao colar no
   * Prompt de Comando do Windows) não passam para a pergunta seguinte: são ignoradas.
   */
  const ask = async (q: string, opts: { def?: string; hidden?: boolean; valid?: (v: string) => boolean; hint?: string } = {}): Promise<string | null> => {
    for (;;) {
      process.stdout.write(opts.def ? `${q} [${opts.def}]: ` : `${q}: `);
      muted = Boolean(opts.hidden) && tty;
      const { value, done } = await lines.next();
      muted = false;
      if (opts.hidden && tty) process.stdout.write("\n");
      if (!tty) process.stdout.write("\n");
      if (done) return null;
      const v = String(value).trim() || opts.def || "";
      if (!v) continue;
      if (!opts.valid || opts.valid(v)) return v;
      console.log(opts.hint ?? "Resposta inválida, tente de novo.");
    }
  };
  const stop = (msg: string) => {
    rl.close();
    console.log(`\n${msg}`);
    process.exitCode = 1;
  };

  console.log("\nConectar o Mercado Livre (API oficial)\n");
  console.log("Você precisa do aplicativo criado em https://developers.mercadolivre.com.br (veja o guia, Parte 8).");
  console.log("Para desistir a qualquer momento: Ctrl+C.\n");
  const clientId = await ask("Client ID (ID do aplicativo)", {
    def: process.env.MERCADOLIVRE_CLIENT_ID || undefined,
    valid: (v) => /^\d+$/.test(v),
    hint: "O Client ID tem só números. Copie de novo da página do aplicativo.",
  });
  if (!clientId) return stop("Cancelado.");
  const keep = process.env.MERCADOLIVRE_CLIENT_SECRET ? "Enter mantém a atual" : undefined;
  const typed = await ask("Client Secret (chave secreta — aparece como ***)", { def: keep, hidden: true });
  if (!typed) return stop("Cancelado.");
  const secret = typed === keep ? process.env.MERCADOLIVRE_CLIENT_SECRET! : typed;
  const redirectUri = await ask("URI de redirect (igual à do aplicativo; Enter aceita)", {
    def: process.env.MERCADOLIVRE_REDIRECT_URI || "https://www.google.com.br/",
    valid: (v) => /^https:\/\//.test(v),
    hint: "O redirect começa com https:// (o mesmo cadastrado no aplicativo).",
  });
  if (!redirectUri) return stop("Cancelado.");

  const link = `${AUTH_URL}?${new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri })}`;
  console.log("\n1) Abra este link no navegador, entre na sua conta do Mercado Livre e clique em Permitir:\n");
  console.log(`   ${link}\n`);
  console.log("2) O navegador vai para o Google. Copie o endereço inteiro da barra (tem ?code=TG-…),");
  console.log("   volte para esta janela, cole (botão direito do mouse) e aperte Enter.\n");
  const pasted = await ask("Cole aqui o endereço (ou só o código TG-…)", {
    valid: (v) => codeFromRedirect(v) != null,
    hint: "Não achei o código (começa com TG-). Copie o endereço inteiro da barra do navegador e cole de novo.",
  });
  rl.close();
  const code = pasted ? codeFromRedirect(pasted) : null;
  if (!code) return stop("Cancelado. Rode npm run ml:conectar de novo; o código vale só alguns minutos.");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: secret, code, redirect_uri: redirectUri }),
    signal: AbortSignal.timeout(15_000),
  }).catch((e: unknown) => {
    console.log(`\nSem conexão com o Mercado Livre: ${e instanceof Error ? e.message : e}`);
    return null;
  });
  if (!res) return void (process.exitCode = 1);
  const data = (await res.json().catch(() => ({}))) as { refresh_token?: string; access_token?: string; message?: string; error?: string };
  if (!res.ok || !data.access_token) {
    console.log(`\nO Mercado Livre recusou (HTTP ${res.status}): ${redact(data.message ?? data.error ?? "sem detalhe")}`);
    console.log("Causas comuns: código usado ou vencido (gere de novo), redirect diferente do cadastrado no aplicativo, chave secreta errada.");
    process.exitCode = 1;
    return;
  }
  if (!data.refresh_token) {
    console.log("\nO Mercado Livre não devolveu o refresh token. No aplicativo, marque o escopo “offline_access” (acesso contínuo), salve e rode de novo.");
    process.exitCode = 1;
    return;
  }

  let text = readFileSync(ENV_FILE, "utf8");
  text = setVar(text, "MERCADOLIVRE_CLIENT_ID", clientId);
  text = setVar(text, "MERCADOLIVRE_CLIENT_SECRET", secret);
  text = setVar(text, "MERCADOLIVRE_REFRESH_TOKEN", data.refresh_token);
  text = setVar(text, "MERCADOLIVRE_REDIRECT_URI", redirectUri);
  writeFileSync(ENV_FILE, text, { mode: 0o600 });
  // O token renovado guardado no banco é de uma autorização antiga: descarta para usar o novo.
  getDb().prepare("DELETE FROM settings WHERE key = 'ml_refresh_token'").run();

  console.log("\nPronto! Mercado Livre conectado e chaves salvas no .env.local.");
  console.log("Teste com:  npm run ml:testar -- COLE_O_LINK_DO_ANUNCIO");
  console.log("Se o site estiver aberto, feche (Ctrl+C) e rode npm run dev de novo para ele ler as chaves.\n");
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function testar(arg: string | undefined, cep: string | undefined) {
  if (!arg) {
    console.log("Uso: npm run ml:testar -- <link do anúncio ou MLB…> [CEP]");
    process.exitCode = 1;
    return;
  }
  let id = /^MLB-?\d{6,}$/i.test(arg) ? arg.toUpperCase().replace("-", "") : null;
  // Link de catálogo (/p/MLB…) sem o anúncio do vendedor: testa só o catálogo.
  const catalogId = arg.match(/\/p\/(MLB\d+)/i)?.[1]?.toUpperCase() ?? null;
  if (!id) {
    const parsed = parseMercadoLivreUrl(arg);
    if (!parsed.externalId && !catalogId) {
      console.log(parsed.hint);
      process.exitCode = 1;
      return;
    }
    id = parsed.externalId;
  }
  const src = sources(getDb()).get("mercado-livre")!;
  const status = src.status();
  if (status.state !== "ativa") {
    console.log(`Mercado Livre não conectado. Faltam: ${status.missingEnv.join(", ")}. Rode: npm run ml:conectar`);
    process.exitCode = 1;
    return;
  }

  const ml = src as MercadoLivreSource;

  // 1) A chave funciona? (/users/me só depende do token)
  console.log("\n1) Conferindo a conexão da conta…");
  try {
    const me = await ml.rawGet<{ id?: number; nickname?: string }>("/users/me");
    console.log(`   OK: conectado como ${me.nickname ?? "?"} (conta ${me.id ?? "?"}).`);
  } catch (e) {
    console.log(`   Falhou: ${redact(e instanceof Error ? e.message : String(e))}`);
    console.log("   A conexão não está valendo. Rode npm run ml:conectar de novo.");
    process.exitCode = 1;
    return;
  }

  // 2) O anúncio do vendedor
  let itemOk = false;
  if (!id) console.log("\n2) O link é da página de catálogo, sem o anúncio de um vendedor: consulta do anúncio pulada.");
  else {
    console.log(`\n2) Consultando o anúncio ${id}…\n`);
    try {
      const l = await src.fetchListing!(id!, { url: arg });
      itemOk = true;
      if (l.via === "catalogo") console.log("   (anúncio bloqueado para o aplicativo; dados lidos da lista de ofertas da página de catálogo)\n");
      console.log(`Título:          ${l.title ?? "(não informado)"}`);
      console.log(`Preço:           ${l.price != null ? brl(l.price) : "(sem preço)"}`);
      console.log(`Disponível:      ${l.availability === "disponivel" ? "sim" : "não"}`);
      console.log(`Frete grátis:    ${l.freeShipping == null ? "não informado" : l.freeShipping ? "sim" : "não"}`);
      console.log(`Peso (anúncio):  ${l.listingWeightGrams != null ? `${(l.listingWeightGrams / 1000).toLocaleString("pt-BR")} kg` : "não informado"}`);
      console.log(`Sabor (anúncio): ${l.listingFlavor ?? "não informado"}`);
      console.log(`Link:            ${l.url ?? "(não informado)"}`);
      console.log(`Foto:            ${l.imageUrl ?? "(não informada)"}`);
      if (cep) {
        const digits = cep.replace(/\D/g, "");
        try {
          const q = await src.quoteShipping!(id!, digits);
          console.log(`Frete p/ ${digits}: ${q.cost === 0 ? "grátis" : brl(q.cost)}${q.deadlineDays != null ? `, cerca de ${q.deadlineDays} dia(s)` : ""}`);
        } catch (e) {
          console.log(`Frete p/ ${digits}: não cotado (${redact(e instanceof Error ? e.message : String(e))})`);
        }
      }
    } catch (e) {
      console.log(`   Falhou: ${redact(e instanceof Error ? e.message : String(e))}`);
    }
  }

  // 3) Página de catálogo (/p/MLB…), quando o link é de catálogo
  let catalogOk = false;
  if (catalogId) {
    console.log(`\n3) Consultando a página de catálogo ${catalogId}…`);
    try {
      const p = await ml.rawGet<{ name?: string; buy_box_winner?: { item_id?: string; price?: number; shipping?: { free_shipping?: boolean } } | null }>(`/products/${catalogId}`);
      catalogOk = true;
      console.log(`   Nome: ${p.name ?? "(não informado)"}`);
      const w = p.buy_box_winner;
      if (w) console.log(`   Oferta em destaque: anúncio ${w.item_id ?? "?"}, ${w.price != null ? brl(w.price) : "sem preço"}, frete grátis: ${w.shipping?.free_shipping == null ? "?" : w.shipping.free_shipping ? "sim" : "não"}`);
      else console.log("   Sem oferta em destaque informada.");
    } catch (e) {
      console.log(`   Falhou: ${redact(e instanceof Error ? e.message : String(e))}`);
    }

    console.log(`\n4) Consultando as ofertas dos vendedores nesse catálogo…`);
    try {
      const r = await ml.rawGet<{ results?: { item_id?: string; price?: number; shipping?: { free_shipping?: boolean } }[] }>(`/products/${catalogId}/items`);
      const list = Array.isArray(r.results) ? r.results : [];
      catalogOk = catalogOk || list.length > 0;
      console.log(`   ${list.length} oferta(s) na lista.`);
      for (const o of list.slice(0, 8)) {
        const mark = id && o.item_id === id ? "  ← o seu anúncio" : "";
        console.log(`   ${o.item_id ?? "?"}: ${o.price != null ? brl(o.price) : "sem preço"}, frete grátis: ${o.shipping?.free_shipping == null ? "?" : o.shipping.free_shipping ? "sim" : "não"}${mark}`);
      }
      if (id && !list.some((o) => o.item_id === id)) console.log(`   O anúncio ${id} não está entre as ofertas listadas.`);
    } catch (e) {
      console.log(`   Falhou: ${redact(e instanceof Error ? e.message : String(e))}`);
    }
  } else if (!itemOk) {
    console.log("\n(Para testar também a página de catálogo, rode com o link completo do anúncio em vez do MLB.)");
  }

  console.log("");
  if (itemOk) console.log("Resultado: a API está funcionando para este anúncio. Na oferta, use “Atualizar automaticamente pela API”.");
  else {
    console.log(
      id
        ? "Resultado: a conta está conectada, mas o Mercado Livre não liberou este anúncio para o seu aplicativo."
        : "Resultado: a conta está conectada. Para testar o anúncio do vendedor, use o link com ?wid=MLB… ou o número MLB do anúncio.",
    );
    if (catalogOk) console.log("A página de catálogo respondeu: cadastre o link com ?wid=MLB… (o do anúncio do vendedor) para o preço vir da lista do catálogo.");
    console.log("Enquanto isso, a oferta continua funcionando no modo manual (preço atualizado por você).");
    process.exitCode = 1;
  }
}

// Buscas que cobrem as marcas mais vendidas; o que se repete entre buscas entra uma vez só.
const BRANDS = [
  "Golden", "Premier", "Royal Canin", "Pedigree", "Whiskas", "Pro Plan", "Purina", "Dog Chow", "Cat Chow", "Friskies",
  "Fórmula Natural", "N&D", "Farmina", "Guabi Natural", "Biofresh", "Hercosul", "Quatree", "Special Dog", "Special Cat",
  "Magnus", "Premiatta", "Three Dogs", "Three Cats", "GranPlus", "Hill's", "Equilíbrio", "Origens", "Nutrilus", "Max",
  "Baw Waw", "Foster", "Kitekat", "Sabor e Vida", "Faro", "Birbo", "Matsuda", "Adimax", "Luopet", "Prediletta",
  "Trustydog", "Nutrive", "Monello", "Seleção Natural", "Premier Nattu", "Primocão", "Keldog", "Dogão", "Top Dog",
];
const TERMS = [
  "ração cães adultos", "ração cães filhotes", "ração cães sênior", "ração cães castrados", "ração cães raças pequenas", "ração cães raças grandes",
  "ração gatos adultos", "ração gatos filhotes", "ração gatos castrados", "ração gatos sênior",
  ...BRANDS.flatMap((b) => [`ração ${b} cães`, `ração ${b} gatos`]),
];
const PER_FILE = 500;

async function catalogo(terms: string[]) {
  const src = sources(getDb()).get("mercado-livre")!;
  if (src.status().state !== "ativa") {
    console.log("Mercado Livre não conectado. Rode: npm run ml:conectar");
    process.exitCode = 1;
    return;
  }
  const ml = src as MercadoLivreSource;
  const list = terms.length ? terms : TERMS;
  const maxPages = terms.length ? 20 : 8;
  let limit = 50;

  // Páginas de catálogo que já estão no site (por ID ou no link) não entram de novo.
  const known = new Set<string>();
  for (const r of getDb().prepare("SELECT external_id, url FROM offers WHERE store_id = 'mercado-livre'").all() as { external_id: string | null; url: string }[]) {
    if (r.external_id) known.add(r.external_id);
    const m = r.url.match(/\/p\/(MLB\d+)/i);
    if (m) known.add(m[1].toUpperCase());
  }

  const found = new Map<string, MlCatalogProduct>();
  console.log(`\nBuscando rações no catálogo do Mercado Livre (${list.length} buscas). Leva alguns minutos…\n`);
  for (const [n, term] of list.entries()) {
    const before = found.size;
    for (let page = 0; page < maxPages; page++) {
      let data: { paging?: { total?: number }; results?: MlCatalogProduct[] };
      try {
        data = await ml.rawGet(`/products/search?status=active&site_id=MLB&q=${encodeURIComponent(term)}&limit=${limit}&offset=${page * limit}`);
      } catch (e) {
        if (e instanceof IntegrationError && e.status === 400 && limit > 10) {
          limit = 10; // a API recusou páginas grandes: segue com páginas menores
          page--;
          continue;
        }
        if (page === 0) console.log(`   “${term}”: não respondeu (${redact(e instanceof Error ? e.message : String(e))})`);
        break;
      }
      const results = Array.isArray(data.results) ? data.results : [];
      for (const p of results) if (p.id && !found.has(p.id)) found.set(p.id, p);
      if (results.length < limit || (page + 1) * limit >= (data.paging?.total ?? 0)) break;
    }
    console.log(`   [${n + 1}/${list.length}] “${term}”: ${found.size - before} novos (total ${found.size})`);
  }

  const rows: CatalogRow[] = [];
  const skipped = new Map<string, number>();
  let already = 0;
  for (const p of found.values()) {
    if (p.id && known.has(p.id)) {
      already++;
      continue;
    }
    const r = catalogRow(p);
    if ("row" in r) rows.push(r.row);
    else skipped.set(r.skip, (skipped.get(r.skip) ?? 0) + 1);
  }
  rows.sort((a, b) => a.especie.localeCompare(b.especie) || a.marca.localeCompare(b.marca, "pt-BR") || a.linha.localeCompare(b.linha, "pt-BR"));

  const dir = path.join(process.cwd(), "catalogo-mercado-livre");
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (let i = 0; i < rows.length; i += PER_FILE) {
    const file = path.join(dir, `parte-${files.length + 1}.csv`);
    writeFileSync(file, toCsv(rows.slice(i, i + PER_FILE)));
    files.push(file);
  }

  console.log(`\nProdutos encontrados: ${found.size}`);
  console.log(`Prontos para importar: ${rows.length}`);
  if (already) console.log(`Já estavam no site: ${already}`);
  for (const [reason, count] of [...skipped].sort((a, b) => b[1] - a[1])) console.log(`Deixados de fora (${reason}): ${count}`);
  if (files.length) {
    console.log(`\nPlanilhas geradas (até ${PER_FILE} linhas cada, o máximo da importação):`);
    for (const f of files) console.log(`   ${f}`);
    console.log("\nAbra no Excel, apague as linhas que não quiser, cole os links de afiliado (coluna link_afiliado)");
    console.log("se já tiver, salve e importe em Produtos → Importar planilha, uma de cada vez.\n");
  }
}

type Category = { id: string; name: string; children_categories?: { id: string; name: string }[] };

/** Categoria de ração de cada espécie: pelo “adivinhador” de categorias do ML e, se falhar, pela árvore de Animais. */
async function foodCategory(ml: MercadoLivreSource, species: "caes" | "gatos"): Promise<string | null> {
  const q = species === "caes" ? "ração para cachorro" : "ração para gato";
  try {
    const found = await ml.rawGet<{ domain_id?: string; category_id?: string }[]>(`/sites/MLB/domain_discovery/search?limit=5&q=${encodeURIComponent(q)}`);
    const hit = (Array.isArray(found) ? found : []).find((d) => d.domain_id === FOOD_DOMAIN && d.category_id);
    if (hit?.category_id) return hit.category_id;
  } catch {
    /* tenta pela árvore */
  }
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  try {
    const animals = await ml.rawGet<Category>("/categories/MLB1071");
    const pet = animals.children_categories?.find((c) => (species === "caes" ? /caes|cachorro/ : /gato/).test(norm(c.name)));
    if (!pet) return null;
    const sub = await ml.rawGet<Category>(`/categories/${pet.id}`);
    return sub.children_categories?.find((c) => /racao|alimento/.test(norm(c.name)))?.id ?? null;
  } catch {
    return null;
  }
}

type MlProduct = MlCatalogProduct & {
  pictures?: { url?: string }[];
  parent_id?: string | null;
  children_ids?: string[];
  pickers?: { picker_name?: string; products?: { product_id?: string }[] }[] | null;
};

/**
 * A ração e as outras versões dela (sabores e pesos): segue os seletores da
 * página de catálogo (os botões “Sabor”, “Peso líquido”…) e, se não houver,
 * os filhos do produto-pai. Cada versão é uma página própria no Mercado Livre.
 */
async function variations(ml: MercadoLivreSource, top: MlProduct, seen: Set<string>, max = 30): Promise<MlProduct[]> {
  const out: MlProduct[] = [top];
  seen.add(top.id!);
  const queue: string[] = [];
  const push = (p: MlProduct) => {
    for (const k of p.pickers ?? []) for (const x of k.products ?? []) if (x.product_id && !seen.has(x.product_id)) queue.push(x.product_id);
  };
  push(top);
  if (!queue.length && top.parent_id) {
    try {
      const parent = await ml.rawGet<MlProduct>(`/products/${top.parent_id}`);
      for (const id of parent.children_ids ?? []) if (!seen.has(id)) queue.push(id);
    } catch {
      /* sem família */
    }
  }
  while (queue.length && out.length < max) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    try {
      const p = await ml.rawGet<MlProduct>(`/products/${id}`);
      if (!p.id) continue;
      out.push(p);
      push(p); // variação da variação: pega as combinações de sabor × peso
    } catch {
      /* versão que não abre: segue */
    }
  }
  return [top, ...out.slice(1).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", { numeric: true }))];
}

/** Tem vendedor ativo na página de catálogo? null = não deu para saber. */
async function hasSellers(ml: MercadoLivreSource, id: string): Promise<boolean | null> {
  try {
    const r = await ml.rawGet<{ results?: unknown[] }>(`/products/${id}/items`);
    return Array.isArray(r.results) ? r.results.length > 0 : null;
  } catch (e) {
    return e instanceof IntegrationError && e.kind === "nao_encontrado" ? false : null;
  }
}

async function maisVendidos(args: string[]) {
  const src = sources(getDb()).get("mercado-livre")!;
  if (src.status().state !== "ativa") {
    console.log("Mercado Livre não conectado. Rode: npm run ml:conectar");
    process.exitCode = 1;
    return;
  }
  const ml = src as MercadoLivreSource;
  const want = Math.min(Math.max(Number(args[0]) || 10, 1), 50);

  const known = new Set<string>();
  for (const r of getDb().prepare("SELECT external_id, url FROM offers WHERE store_id = 'mercado-livre'").all() as { external_id: string | null; url: string }[]) {
    if (r.external_id) known.add(r.external_id);
    const m = r.url.match(/\/p\/(MLB\d+)/i);
    if (m) known.add(m[1].toUpperCase());
  }

  const groups: { title: string; entries: LinkEntry[] }[] = [];
  const rows: CatalogRow[] = [];
  const seen = new Set<string>();
  let unavailable = 0;
  for (const species of ["caes", "gatos"] as const) {
    const label = species === "caes" ? "Cães" : "Gatos";
    const category = await foodCategory(ml, species);
    if (!category) {
      console.log(`\n${label}: não achei a categoria de ração no Mercado Livre.`);
      continue;
    }
    let content: { id?: string; position?: number; type?: string }[] = [];
    try {
      const h = await ml.rawGet<{ content?: typeof content }>(`/highlights/MLB/category/${category}`);
      content = Array.isArray(h.content) ? h.content : [];
    } catch (e) {
      console.log(`\n${label}: a lista de mais vendidos não respondeu (${redact(e instanceof Error ? e.message : String(e))}).`);
      continue;
    }
    console.log(`\n${label} (categoria ${category}): ${content.length} na lista de mais vendidos`);

    const entries: LinkEntry[] = [];
    let ready = 0;
    let noCatalog = 0;
    for (const h of content.sort((a, b) => (a.position ?? 99) - (b.position ?? 99))) {
      if (ready >= want) break;
      if (h.type !== "PRODUCT" || !h.id) {
        noCatalog++; // anúncio avulso, sem página de catálogo: a API não deixa ler
        continue;
      }
      let top: MlProduct;
      try {
        top = await ml.rawGet(`/products/${h.id}`);
      } catch {
        noCatalog++;
        continue;
      }
      if (seen.has(h.id)) continue;
      const topRow = catalogRow(top);
      // Úmida, petisco etc. não entram nem contam entre as mais vendidas.
      if ("skip" in topRow && !known.has(h.id)) {
        console.log(`   ${h.position}º ${top.name ?? h.id}  → pulada: ${topRow.skip}`);
        continue;
      }
      const family = await variations(ml, top, seen);
      for (const [i, p] of family.entries()) {
        const entry: LinkEntry = {
          position: h.position ?? 0,
          variant: i > 0,
          name: p.name ?? p.id!,
          imageUrl: p.pictures?.[0]?.url?.replace(/^http:/, "https:") ?? null,
          pageUrl: `https://www.mercadolivre.com.br/p/${p.id}`,
          row: null,
          note: null,
        };
        const r = i === 0 ? topRow : catalogRow(p);
        if (known.has(p.id!)) entry.note = "Já está no site.";
        else if ("row" in r) {
          entry.row = r.row;
          rows.push(r.row);
          if ((await hasSellers(ml, p.id!)) === false) {
            entry.unavailable = true;
            unavailable++;
          }
        } else {
          if (i > 0) continue; // variação que não serve (úmida, kit…): nem aparece
          entry.note = `Fica de fora: ${r.skip}.`;
        }
        entries.push(entry);
        console.log(`   ${i ? "     ↳" : `${entry.position}º`} ${entry.name}${entry.note ? `  → ${entry.note}` : entry.unavailable ? "  → indisponível no momento" : ""}`);
      }
      ready++;
    }
    if (noCatalog) console.log(`   (${noCatalog} da lista são anúncios sem página de catálogo e foram pulados)`);
    groups.push({ title: `${label}: ${ready} mais vendidas e seus outros sabores e pesos`, entries });
  }

  if (!rows.length) {
    console.log("\nNenhum produto novo para importar.");
    return;
  }
  const dir = path.join(process.cwd(), "catalogo-mercado-livre");
  mkdirSync(dir, { recursive: true });
  const csv = path.join(dir, "mais-vendidos.csv");
  const html = path.join(dir, "mais-vendidos.html");
  writeFileSync(csv, toCsv(rows));
  writeFileSync(html, linksPage("Rações mais vendidas no Mercado Livre", groups));
  console.log(`\nProntos para importar: ${rows.length}`);
  if (unavailable) console.log(`Indisponíveis no momento (sem link de afiliado por enquanto): ${unavailable}`);
  console.log(`\nAbra esta página no navegador (dois cliques no arquivo):\n   ${html}`);
  console.log("Nela tem o link de cada ração para gerar o link de afiliado e o botão que baixa a planilha preenchida.");
  console.log(`\nA mesma planilha, sem os links de afiliado: ${csv}\n`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "conectar") await conectar();
  else if (cmd === "testar") await testar(rest[0], rest[1]);
  else if (cmd === "catalogo") await catalogo(rest);
  else if (cmd === "mais-vendidos") await maisVendidos(rest);
  else {
    console.log("Uso: tsx scripts/mercado-livre.ts conectar | testar <link|MLB…> [CEP] | catalogo [termos…] | mais-vendidos [quantidade]");
    process.exitCode = 1;
  }
}

main();
