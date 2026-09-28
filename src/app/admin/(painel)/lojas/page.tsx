import type { Metadata } from "next";

import { importCsvAction, saveSettingsAction, saveStoreAction, syncStoreAction } from "@/app/admin/actions";
import { btn, Flash, formatDateTime, input, PageHeader, Tag } from "@/components/admin/ui";
import { StoreLogo } from "@/components/icons/store-logo";
import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/domain/settings";
import { listStores } from "@/lib/domain/stores";
import type { Store } from "@/lib/domain/types";
import { ADAPTER_IDS, sourceForStore, sources } from "@/lib/integrations";
import type { SourceCapabilities } from "@/lib/integrations/types";

export const metadata: Metadata = { title: "Lojas e integrações" };

const CAP_LABEL: Record<keyof SourceCapabilities, string> = {
  searchListings: "buscar anúncios",
  refreshPrice: "atualizar preço",
  availability: "disponibilidade",
  shippingQuote: "frete por CEP",
  affiliateLink: "gerar link de afiliado",
};

const MODE_LABEL = { manual: "Manual", feed: "Arquivo / feed", api: "API" } as const;

function StoreFields({ store }: { store: Store | null }) {
  const adapters = sources();
  return (
    <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
      {store ? <input type="hidden" name="id" value={store.id} /> : <input type="hidden" name="novo" value="1" />}
      <label className="space-y-1">
        <span className="font-medium">Nome</span>
        <input name="nome" required defaultValue={store?.name} className={input} />
      </label>
      <label className="space-y-1">
        <span className="font-medium">Domínios da loja</span>
        <input name="dominios" required defaultValue={store?.domains.join(", ")} placeholder="loja.com.br" className={input} />
      </label>
      <label className="space-y-1">
        <span className="font-medium">Domínios extras do link de afiliado</span>
        <input name="dominiosAfiliado" defaultValue={store?.affiliateDomains.join(", ")} placeholder="ex.: encurtador do programa" className={input} />
      </label>
      <label className="space-y-1">
        <span className="font-medium">Como as ofertas chegam</span>
        <select name="modo" defaultValue={store?.mode ?? "manual"} className={input}>
          <option value="manual">Manual</option>
          <option value="feed">Arquivo CSV / feed autorizado</option>
          <option value="api">API da loja</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="font-medium">Adaptador (arquivo ou API)</span>
        <select name="adaptador" defaultValue={store?.adapter ?? ""} className={input}>
          <option value="">Nenhum</option>
          {ADAPTER_IDS.map((id) => (
            <option key={id} value={id}>
              {adapters.get(id)?.label ?? id}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="font-medium">Exibição de preço</span>
        <select name="exibicao" defaultValue={store?.priceDisplay ?? "sempre"} className={input}>
          <option value="sempre">Mostrar preço cadastrado ou importado</option>
          <option value="somente_api">Só preço da API oficial, recente (regra da loja)</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="font-medium">Cor do selo</span>
        <input name="cor" type="color" defaultValue={store?.color ?? "#6b7280"} className={input + " p-0.5"} />
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="font-medium">Logotipo (https, com autorização de uso)</span>
        <input name="logo" type="url" defaultValue={store?.logoUrl ?? ""} className={input} />
      </label>
      <label className="flex items-center gap-2 self-end pb-1.5 text-sm">
        <input type="checkbox" name="ativa" defaultChecked={store ? store.active : true} className="accent-foreground" /> Loja ativa
      </label>
    </div>
  );
}

export default async function StoresPage({ searchParams }: PageProps<"/admin/lojas">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const db = getDb();
  const stores = listStores(db);
  const settings = getSettings(db);
  const offerCounts = new Map(
    (db.prepare("SELECT store_id AS s, COUNT(*) AS n FROM offers WHERE active = 1 GROUP BY store_id").all() as { s: string; n: number }[]).map((r) => [r.s, r.n]),
  );
  const runs = db.prepare("SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 12").all() as {
    id: number;
    store_id: string;
    trigger: string;
    started_at: string;
    finished_at: string | null;
    checked: number;
    updated: number;
    failed: number;
    message: string | null;
  }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lojas e integrações"
        description="Como as ofertas de cada loja chegam (manual, arquivo ou API) e o que cada integração consegue fazer. Credenciais ficam só em variáveis de ambiente do servidor: aqui aparecem apenas os nomes que faltam."
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      <form action={saveSettingsAction} className="flex flex-wrap items-end gap-3 rounded-lg border p-4 text-xs">
        <label className="space-y-1">
          <span className="font-medium">Prazo de atualização dos preços (horas)</span>
          <input name="prazo" type="number" min={1} max={720} defaultValue={settings.staleHours} className={input + " w-28"} />
        </label>
        <label className="space-y-1">
          <span className="font-medium">Validade da cotação de frete (horas)</span>
          <input name="validadeFrete" type="number" min={1} max={48} defaultValue={settings.shippingQuoteHours} className={input + " w-28"} />
        </label>
        <button type="submit" className={btn.secondary}>
          Salvar
        </button>
        <p className="basis-full text-muted-foreground">
          Depois do prazo, o preço aparece como desatualizado no site. A atualização programada (rota <code>/api/cron/precos</code>) consulta só as ofertas vencidas das
          lojas com API ativa; uma loja com problema não trava as outras.
        </p>
      </form>

      <ul className="space-y-4">
        {stores.map((s) => {
          const src = sourceForStore(s, db);
          const st = src.status();
          const caps = src.capabilities();
          return (
            <li key={s.id} id={`loja-${s.id}`} className="scroll-mt-20 rounded-lg border">
              <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                <StoreLogo name={s.name} color={s.color} logo={s.logoUrl} size={28} />
                <h2 className="font-display font-semibold">{s.name}</h2>
                <Tag>{MODE_LABEL[s.mode]}</Tag>
                {st.state === "ativa" ? <Tag tone="good">Integração ativa</Tag> : st.state === "pendente" ? <Tag tone="warn">Integração pendente</Tag> : <Tag>Cadastro manual</Tag>}
                {s.priceDisplay === "somente_api" && <Tag tone="warn">Preço só via API</Tag>}
                {!s.active && <Tag>Inativa</Tag>}
                <span className="ml-auto text-xs text-muted-foreground">{offerCounts.get(s.id) ?? 0} oferta(s) ativa(s)</span>
              </div>
              <div className="space-y-3 px-4 py-3 text-sm">
                <p>
                  <span className="font-medium">{src.label}:</span> {st.note}
                </p>
                {st.missingEnv.length > 0 && (
                  <p className="text-xs">
                    Falta configurar no servidor:{" "}
                    {st.missingEnv.map((k) => (
                      <code key={k} className="mr-1.5 rounded bg-amber-50 px-1 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                        {k}
                      </code>
                    ))}
                  </p>
                )}
                <p className="flex flex-wrap gap-1.5 text-xs">
                  {(Object.keys(CAP_LABEL) as (keyof SourceCapabilities)[]).map((k) => (
                    <span key={k} className={caps[k] ? "rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "rounded bg-muted px-1.5 py-0.5 text-muted-foreground line-through"}>
                      {CAP_LABEL[k]}
                    </span>
                  ))}
                </p>
                <p className="text-xs text-muted-foreground">{src.terms}</p>

                <div className="flex flex-wrap gap-2">
                  {s.mode === "api" && (
                    <form action={syncStoreAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" disabled={st.state !== "ativa"} className={btn.secondary}>
                        Atualizar agora
                      </button>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="todas" className="accent-foreground" /> incluir as não vencidas
                      </label>
                    </form>
                  )}
                  {s.mode === "feed" && (
                    <form action={importCsvAction} className="flex flex-wrap items-center gap-2 text-xs">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="file" name="arquivo" accept=".csv,text/csv" required className="text-xs" />
                      <button type="submit" className={btn.secondary}>
                        Importar arquivo
                      </button>
                      <span className="text-muted-foreground">Colunas: id_anuncio, preco, disponivel, titulo, frete_gratis</span>
                    </form>
                  )}
                </div>

                <details className="[&_summary::-webkit-details-marker]:hidden">
                  <summary className="cursor-pointer list-none text-xs font-medium underline underline-offset-4">Editar loja</summary>
                  <form action={saveStoreAction} className="mt-3 space-y-3 rounded-md border p-3">
                    <StoreFields store={s} />
                    <button type="submit" className={btn.primary}>
                      Salvar loja
                    </button>
                  </form>
                </details>
              </div>
            </li>
          );
        })}
      </ul>

      <details open={one(sp.nova) === "1"} className="rounded-lg border p-4 [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none font-display text-sm font-semibold">+ Nova loja</summary>
        <form action={saveStoreAction} className="mt-3 space-y-3">
          <StoreFields store={null} />
          <button type="submit" className={btn.primary}>
            Cadastrar loja
          </button>
        </form>
      </details>

      <section aria-labelledby="execucoes">
        <h2 id="execucoes" className="mb-2 font-display text-sm font-semibold">
          Últimas atualizações automáticas
        </h2>
        {runs.length ? (
          <ul className="divide-y rounded-lg border text-xs">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2">
                <span className="font-medium">{stores.find((s) => s.id === r.store_id)?.name ?? r.store_id}</span>
                <span className="text-muted-foreground">
                  {formatDateTime(r.started_at)} · {r.trigger}
                </span>
                <span className="tabular-nums">
                  {r.checked} consultadas · {r.updated} atualizadas · <span className={r.failed ? "font-semibold text-red-700 dark:text-red-400" : ""}>{r.failed} com erro</span>
                </span>
                {r.message && <span className="text-muted-foreground">{r.message}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma atualização automática ainda: nenhuma loja tem integração por API ativa.</p>
        )}
      </section>
    </div>
  );
}
