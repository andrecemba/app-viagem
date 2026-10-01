import { IntegrationError } from "./types";

/**
 * Cliente HTTP das integrações: tempo limite, limite de chamadas por fonte,
 * novas tentativas só para falhas temporárias e cache curto. Só roda no servidor.
 */

const lastCall = new Map<string, number>();
const cache = new Map<string, { expires: number; value: unknown }>();

async function throttle(source: string, minIntervalMs: number) {
  const wait = (lastCall.get(source) ?? 0) + minIntervalMs - Date.now();
  lastCall.set(source, Date.now() + Math.max(0, wait));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);
  return load().then((value) => {
    cache.set(key, { expires: Date.now() + ttlMs, value });
    if (cache.size > 2000) for (const [k, v] of cache) if (v.expires < Date.now()) cache.delete(k);
    return value;
  });
}

export function clearIntegrationCache() {
  cache.clear();
  lastCall.clear();
}

/** Tira segredos de mensagens antes de registrar. */
export function redact(text: string) {
  return text
    .replace(/(access_token|refresh_token|client_secret|token|secret|signature)=([^&\s]+)/gi, "$1=***")
    .replace(/(Bearer|Credential=)\s*[A-Za-z0-9._\-]+/g, "$1 ***");
}

export function logIntegrationError(source: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[integração:${source}] ${redact(message)}`);
}

export interface RequestOptions {
  source: string;
  minIntervalMs?: number;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
}

export async function requestJson<T = unknown>(url: string, init: RequestInit, opts: RequestOptions): Promise<T> {
  const { source, minIntervalMs = 300, timeoutMs = 10_000, retries = 2, fetchImpl = fetch } = opts;
  let attempt = 0;
  for (;;) {
    await throttle(source, minIntervalMs);
    let res: Response;
    try {
      res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    } catch (e) {
      if (attempt++ < retries) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      throw new IntegrationError(`Falha de rede ao consultar ${source}: ${e instanceof Error ? e.message : e}`, "rede");
    }
    if (res.ok) {
      try {
        return (await res.json()) as T;
      } catch {
        throw new IntegrationError(`Resposta de ${source} não é JSON.`, "api_mudou", res.status);
      }
    }
    if ((res.status === 429 || res.status >= 500) && attempt++ < retries) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await new Promise((r) => setTimeout(r, Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 800 * 2 ** attempt));
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new IntegrationError(`${source} recusou o acesso (HTTP ${res.status}). Confira credenciais e permissões do aplicativo.`, "permissao", res.status);
    if (res.status === 404) throw new IntegrationError(`${source}: anúncio não encontrado (HTTP 404).`, "nao_encontrado", 404);
    if (res.status === 429) throw new IntegrationError(`${source}: limite de chamadas atingido (HTTP 429).`, "limite", 429);
    if (res.status >= 500) throw new IntegrationError(`${source} indisponível (HTTP ${res.status}).`, "indisponivel", res.status);
    throw new IntegrationError(`${source} respondeu HTTP ${res.status}.`, "api_mudou", res.status);
  }
}
