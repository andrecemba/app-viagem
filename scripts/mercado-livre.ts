/**
 * Mercado Livre pela linha de comando.
 *   npm run ml:conectar              autoriza sua conta no aplicativo e grava as chaves no .env.local
 *   npm run ml:testar -- <link|MLB…> [CEP]   consulta um anúncio pela API oficial (e o frete, se passar o CEP)
 * Tudo roda no seu computador; as chaves ficam só no .env.local (nunca vão para o navegador).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

import { getDb } from "../src/lib/db";
import { codeFromRedirect, parseMercadoLivreUrl } from "../src/lib/integrations/adapters/mercado-livre";
import { redact } from "../src/lib/integrations/http";
import { sources } from "../src/lib/integrations";
import { IntegrationError } from "../src/lib/integrations/types";

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
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (q: string, def?: string) => {
    process.stdout.write(def ? `${q} [${def}]: ` : `${q}: `);
    const { value, done } = await lines.next();
    if (!process.stdin.isTTY) process.stdout.write("\n");
    return (done ? "" : String(value).trim()) || def || "";
  };

  console.log("\nConectar o Mercado Livre (API oficial)\n");
  console.log("Você precisa do aplicativo criado em https://developers.mercadolivre.com.br (veja o guia, Parte 8).\n");
  const clientId = await ask("Client ID (ID do aplicativo)", process.env.MERCADOLIVRE_CLIENT_ID || undefined);
  const clientSecret = await ask("Client Secret (chave secreta)", process.env.MERCADOLIVRE_CLIENT_SECRET ? "manter a atual" : undefined);
  const secret = clientSecret === "manter a atual" ? process.env.MERCADOLIVRE_CLIENT_SECRET! : clientSecret;
  const redirectUri = await ask("URI de redirect (igual à do aplicativo)", process.env.MERCADOLIVRE_REDIRECT_URI || "https://www.google.com.br/");
  if (!/^\d+$/.test(clientId) || !secret || !/^https:\/\//.test(redirectUri)) {
    console.log("\nConfira: o Client ID tem só números, a chave secreta não pode ficar vazia e o redirect começa com https://.");
    rl.close();
    process.exitCode = 1;
    return;
  }

  const link = `${AUTH_URL}?${new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri })}`;
  console.log("\n1) Abra este link no navegador, entre na sua conta do Mercado Livre e clique em Permitir:\n");
  console.log(`   ${link}\n`);
  console.log("2) O navegador vai para outra página. Copie o endereço inteiro da barra (tem ?code=TG-…).\n");
  const pasted = await ask("Cole aqui o endereço (ou só o código TG-…)");
  rl.close();
  const code = codeFromRedirect(pasted);
  if (!code) {
    console.log("\nNão encontrei o código (começa com TG-). Rode npm run ml:conectar de novo; o código vale só alguns minutos.");
    process.exitCode = 1;
    return;
  }

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
  if (!id) {
    const parsed = parseMercadoLivreUrl(arg);
    if (!parsed.externalId) {
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

  console.log(`\nConsultando ${id} na API oficial do Mercado Livre…\n`);
  try {
    const l = await src.fetchListing!(id);
    console.log(`Título:          ${l.title ?? "(não informado)"}`);
    console.log(`Preço:           ${l.price != null ? brl(l.price) : "(sem preço)"}`);
    console.log(`Disponível:      ${l.availability === "disponivel" ? "sim" : "não"}`);
    console.log(`Frete grátis:    ${l.freeShipping == null ? "não informado" : l.freeShipping ? "sim" : "não"}`);
    console.log(`Peso (anúncio):  ${l.listingWeightGrams != null ? `${l.listingWeightGrams / 1000} kg` : "não informado"}`);
    console.log(`Sabor (anúncio): ${l.listingFlavor ?? "não informado"}`);
    console.log(`Link:            ${l.url ?? "(não informado)"}`);
    if (cep) {
      const digits = cep.replace(/\D/g, "");
      const q = await src.quoteShipping!(id, digits);
      console.log(`Frete p/ ${digits}: ${q.cost === 0 ? "grátis" : brl(q.cost)}${q.deadlineDays != null ? `, cerca de ${q.deadlineDays} dia(s)` : ""}`);
    }
    console.log("\nA API está funcionando. No painel, a Nova oferta desse anúncio mostra o botão “Buscar dados do anúncio pela API”.\n");
  } catch (e) {
    if (e instanceof IntegrationError) {
      console.log(`Falhou (${e.kind}): ${redact(e.message)}`);
      if (e.kind === "permissao") {
        console.log("O Mercado Livre não liberou este anúncio para o seu aplicativo. Confira as chaves (npm run ml:conectar de novo).");
        console.log("Se as chaves estiverem certas, a API pode estar restringindo anúncios de outros vendedores: cadastre essa oferta manualmente.");
      }
      if (e.kind === "nao_encontrado") console.log("Confira o link: abra o anúncio do vendedor (não a página /p/ de catálogo) e copie de novo.");
    } else {
      console.log(`Falhou: ${redact(e instanceof Error ? e.message : String(e))}`);
    }
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
