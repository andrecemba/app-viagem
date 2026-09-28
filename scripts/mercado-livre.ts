/**
 * Mercado Livre pela linha de comando.
 *   npm run ml:conectar              autoriza sua conta no aplicativo e grava as chaves no .env.local
 *   npm run ml:testar -- <link|MLB…> [CEP]   consulta um anúncio pela API oficial (e o frete, se passar o CEP)
 * Tudo roda no seu computador; as chaves ficam só no .env.local (nunca vão para o navegador).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

import { getDb } from "../src/lib/db";
import { codeFromRedirect, parseMercadoLivreUrl, type MercadoLivreSource } from "../src/lib/integrations/adapters/mercado-livre";
import { redact } from "../src/lib/integrations/http";
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

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "conectar") await conectar();
  else if (cmd === "testar") await testar(rest[0], rest[1]);
  else {
    console.log("Uso: tsx scripts/mercado-livre.ts conectar | testar <link|MLB…> [CEP]");
    process.exitCode = 1;
  }
}

main();
