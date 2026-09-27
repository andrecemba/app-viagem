import type { Metadata } from "next";
import Link from "next/link";

import { brl, btn, DemoBadge, EmptyState, Flash, formatAge, formatDateTime, input, PageHeader, Tag } from "@/components/admin/ui";
import { productLabel } from "@/lib/admin/alerts";
import { requireAdmin } from "@/lib/admin/auth";
import { AVAILABILITY_LABEL } from "@/lib/admin/labels";
import { adminRepo } from "@/lib/admin/repository";
import type { AdminOffer, StoreConfig } from "@/lib/admin/types";

import { checkNowAction } from "../../actions";

export const metadata: Metadata = { title: "Ofertas" };

type Situation = "todas" | "ativas" | "desatualizadas" | "falha" | "ocultas" | "indisponiveis";

function situationOf(o: AdminOffer, store: StoreConfig | undefined, now: Date): Situation[] {
  const out: Situation[] = [];
  const age = o.lastSuccessAt ? (now.getTime() - new Date(o.lastSuccessAt).getTime()) / 3600_000 : Infinity;
  if (o.hidden) out.push("ocultas");
  else if (o.fields.availability.value === "disponivel") out.push("ativas");
  if (o.fields.availability.value !== "disponivel") out.push("indisponiveis");
  if (store && age > store.staleAfterHours) out.push("desatualizadas");
  if (o.consecutiveFailures > 0) out.push("falha");
  return out;
}

const SITUATION_LABEL: Record<Situation, string> = {
  todas: "Todas",
  ativas: "Ativas",
  desatualizadas: "Desatualizadas",
  falha: "Com falha",
  indisponiveis: "Indisponíveis",
  ocultas: "Ocultas",
};

export default async function OffersPage({ searchParams }: PageProps<"/admin/ofertas">) {
  await requireAdmin();
  const [db, sp] = await Promise.all([adminRepo.read(), searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const now = new Date();
  const situation = (one(sp.situacao) ?? "todas") as Situation;
  const storeFilter = one(sp.loja) ?? "";
  const q = (one(sp.q) ?? "").trim().toLowerCase();
  const storeById = new Map(db.stores.map((s) => [s.id, s]));
  const productById = new Map(db.products.map((p) => [p.id, p]));

  const all = db.offers.map((o) => ({ o, store: storeById.get(o.storeId), product: productById.get(o.productId), sit: situationOf(o, storeById.get(o.storeId), now) }));
  const counts = Object.fromEntries((Object.keys(SITUATION_LABEL) as Situation[]).map((s) => [s, s === "todas" ? all.length : all.filter((x) => x.sit.includes(s)).length]));
  const rows = all
    .filter((x) => situation === "todas" || x.sit.includes(situation))
    .filter((x) => !storeFilter || x.o.storeId === storeFilter)
    .filter((x) => !q || `${x.product ? productLabel(x.product) : ""} ${x.o.externalId} ${x.o.fields.sellerName.value ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => (a.product ? productLabel(a.product) : "").localeCompare(b.product ? productLabel(b.product) : "", "pt-BR"));

  const href = (s: Situation) => {
    const p = new URLSearchParams();
    if (s !== "todas") p.set("situacao", s);
    if (storeFilter) p.set("loja", storeFilter);
    if (q) p.set("q", q);
    return `/admin/ofertas${p.size ? `?${p}` : ""}`;
  };
  const returnTo = href(situation);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ofertas"
        description="Anúncios de cada produto nas lojas. Preços de consultas com falha nunca são zerados: ficam como estavam e aparecem como desatualizados."
        actions={
          <form action={checkNowAction}>
            <input type="hidden" name="voltar" value={returnTo} />
            <button className={btn.secondary} type="submit">
              Verificar ofertas vencidas
            </button>
          </form>
        }
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label="Situação" className="-mx-1 flex gap-1 overflow-x-auto">
          {(Object.keys(SITUATION_LABEL) as Situation[]).map((s) => (
            <Link
              key={s}
              href={href(s)}
              aria-current={s === situation ? "page" : undefined}
              className={
                "rounded-md px-2.5 py-1 text-sm whitespace-nowrap " +
                (s === situation ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              {SITUATION_LABEL[s]} <span className="tabular-nums opacity-70">{counts[s]}</span>
            </Link>
          ))}
        </nav>
        <form className="ml-auto flex gap-2" action="/admin/ofertas">
          {situation !== "todas" && <input type="hidden" name="situacao" value={situation} />}
          <select name="loja" defaultValue={storeFilter} className={input + " w-36"} aria-label="Loja">
            <option value="">Todas as lojas</option>
            {db.stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="q" defaultValue={q} placeholder="Produto, código ou vendedor" className={input + " w-48"} aria-label="Buscar ofertas" />
          <button className={btn.secondary} type="submit">
            Filtrar
          </button>
        </form>
      </div>

      {rows.length ? (
        <div className="relative overflow-x-auto rounded-md border">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Loja · vendedor</th>
                <th className="px-3 py-2 text-right font-medium">Preço</th>
                <th className="px-3 py-2 text-right font-medium">R$/kg</th>
                <th className="px-3 py-2 font-medium">Links</th>
                <th className="px-3 py-2 font-medium">Disponibilidade</th>
                <th className="px-3 py-2 font-medium">Última atualização</th>
                <th className="px-3 py-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(({ o, store, product, sit }) => {
                const w = product?.fields.weightGrams.value;
                const price = o.fields.price.value;
                const aff = o.fields.affiliateUrl.value;
                return (
                  <tr key={o.id} className="align-top hover:bg-muted/40">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/ofertas/${o.id}`} className="font-medium hover:underline">
                        {product ? productLabel(product) : o.productId}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {o.externalId} {o.demo && <DemoBadge />}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      {store?.name ?? o.storeId}
                      <p className="text-xs text-muted-foreground">{o.fields.sellerName.value ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <span className={sit.includes("desatualizadas") ? "text-muted-foreground" : "font-medium"}>{brl(price)}</span>
                      {o.fields.price.locked && <p className="text-[0.6875rem] text-muted-foreground">travado</p>}
                      {o.fields.price.pendingAuto && <p className="text-[0.6875rem] text-amber-800 dark:text-amber-300">novo: {brl(o.fields.price.pendingAuto.value)}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{price && w ? brl((price / w) * 1000) : "—"}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {o.fields.url.value ? (
                        <a href={o.fields.url.value} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">
                          Original
                        </a>
                      ) : (
                        <span className="text-muted-foreground">sem URL</span>
                      )}
                      <br />
                      {aff ? (
                        <span title={aff} className={o.linkStatus === "ok" ? "" : "text-amber-800 dark:text-amber-300"}>
                          Afiliado · {o.linkStatus === "ok" ? "ok" : o.linkStatus === "nao_verificado" ? "não verificado" : o.linkStatus === "quebrado" ? "quebrado" : "outro produto"}
                        </span>
                      ) : (
                        <span className="text-amber-800 dark:text-amber-300">Afiliado vazio</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {o.hidden ? <Tag>Oculta</Tag> : o.fields.availability.value ? AVAILABILITY_LABEL[o.fields.availability.value] : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <span title={formatDateTime(o.lastSuccessAt)}>{formatAge(o.lastSuccessAt, now)}</span>
                      {sit.includes("desatualizadas") && <Tag tone="warn">Desatualizada</Tag>}
                      {o.consecutiveFailures > 0 && <p className="text-red-700 dark:text-red-400">{o.consecutiveFailures} falha(s): {o.lastError}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <form action={checkNowAction}>
                        <input type="hidden" name="ids" value={o.id} />
                        <input type="hidden" name="voltar" value={returnTo} />
                        <button className={btn.secondary + " h-7 text-xs whitespace-nowrap"} type="submit">
                          Verificar agora
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={db.offers.length ? "Nenhuma oferta nessa situação." : "Nenhuma oferta cadastrada."}>
          {db.offers.length ? (
            <Link href="/admin/ofertas" className="underline underline-offset-4">
              Ver todas as ofertas
            </Link>
          ) : (
            <>
              Os produtos podem existir sem ofertas. Para cadastrar, abra um produto e use “Cadastrar oferta manualmente”, ou ligue o modo de
              demonstração na{" "}
              <Link href="/admin" className="underline underline-offset-4">
                Visão geral
              </Link>{" "}
              para testar com dados fictícios.
            </>
          )}
        </EmptyState>
      )}
    </div>
  );
}
