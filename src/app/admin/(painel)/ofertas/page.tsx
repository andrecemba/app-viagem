import type { Metadata } from "next";
import Link from "next/link";

import { brl, DemoBadge, EmptyState, Flash, formatDateTime, input, PageHeader, Tag } from "@/components/admin/ui";
import { StoreLogo } from "@/components/icons/store-logo";
import { requireAdmin } from "@/lib/admin/auth";
import { offerRows } from "@/lib/admin/data";
import { getDb } from "@/lib/db";
import { ALERT_LABEL, ALERT_ORDER, type AlertKind } from "@/lib/domain/alerts";
import { productName } from "@/lib/domain/products";
import { listStores } from "@/lib/domain/stores";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ofertas e alertas" };

const SERIOUS = new Set<AlertKind>(["produto_incerto", "divergencia_peso", "divergencia_sabor", "erro_importacao", "afiliado_invalido"]);

export default async function OffersPage({ searchParams }: PageProps<"/admin/ofertas">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const db = getDb();
  const alerta = one(sp.alerta) as AlertKind | undefined;
  const loja = one(sp.loja);
  const exemplos = one(sp.exemplos) === "1";
  const q = one(sp.q)?.trim().toLowerCase() ?? "";

  const all = offerRows(db).filter((r) => r.offer.active && (exemplos || !r.offer.isDemo));
  const counts = new Map<AlertKind, number>();
  for (const r of all) for (const a of r.alerts) counts.set(a.kind, (counts.get(a.kind) ?? 0) + 1);
  const rows = all
    .filter((r) => (!alerta || r.alerts.some((a) => a.kind === alerta)) && (!loja || r.store.id === loja) && (!q || productName(r.product).toLowerCase().includes(q)))
    .sort((a, b) => ALERT_ORDER.indexOf(a.alerts[0]?.kind ?? ("zz" as AlertKind)) - ALERT_ORDER.indexOf(b.alerts[0]?.kind ?? ("zz" as AlertKind)) || b.alerts.length - a.alerts.length);
  const shown = rows.slice(0, 300);
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { alerta, loja, exemplos: exemplos ? "1" : undefined, q: q || undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/ofertas${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Ofertas e alertas" description="Todas as ofertas ativas, com o que precisa de atenção primeiro. Os alertas são recalculados a cada abertura." />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      <nav aria-label="Alertas" className="flex flex-wrap gap-1.5">
        <Link href={href({ alerta: undefined })} className={cn("rounded-md border px-2.5 py-1 text-sm", !alerta && "border-foreground font-medium")}>
          Todas <span className="text-muted-foreground tabular-nums">{all.length}</span>
        </Link>
        {ALERT_ORDER.filter((k) => counts.get(k)).map((k) => (
          <Link key={k} href={href({ alerta: k })} className={cn("rounded-md border px-2.5 py-1 text-sm", alerta === k && "border-foreground font-medium", SERIOUS.has(k) && "text-red-800 dark:text-red-300")}>
            {ALERT_LABEL[k]} <span className="tabular-nums opacity-70">{counts.get(k)}</span>
          </Link>
        ))}
      </nav>

      <form className="flex flex-wrap items-center gap-2 text-sm" action="/admin/ofertas">
        {alerta && <input type="hidden" name="alerta" value={alerta} />}
        <input name="q" defaultValue={q} placeholder="Buscar produto" className={input + " w-56"} />
        <select name="loja" defaultValue={loja ?? ""} className={input + " w-44"} aria-label="Loja">
          <option value="">Todas as lojas</option>
          {listStores(db).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="exemplos" value="1" defaultChecked={exemplos} className="accent-foreground" /> Incluir ofertas de exemplo
        </label>
        <button type="submit" className="h-8 rounded-md border px-3 font-medium">
          Filtrar
        </button>
        <span className="ml-auto text-muted-foreground">
          {rows.length} oferta(s){rows.length > shown.length ? `, mostrando ${shown.length}` : ""}
        </span>
      </form>

      {shown.length ? (
        <div className="relative overflow-x-auto rounded-md border">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-2 py-2 font-medium">Loja</th>
                <th className="px-2 py-2 font-medium">Preço</th>
                <th className="px-2 py-2 font-medium">Alertas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map(({ offer, product, store, alerts }) => (
                <tr key={offer.id} className="align-top hover:bg-muted/40">
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/ofertas/${offer.id}`} className="font-medium hover:underline">
                      {productName(product)}
                    </Link>
                    {offer.isDemo && (
                      <span className="ml-1.5">
                        <DemoBadge />
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <StoreLogo name={store.name} color={store.color} logo={store.logoUrl} size={18} /> {store.name}
                    </span>
                    <p className="text-xs text-muted-foreground">{offer.dataSource === "manual" ? "Manual" : offer.dataSource === "api" ? "API" : "Arquivo"}</p>
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap tabular-nums">
                    {offer.price != null ? brl(offer.price) : "—"}
                    <p className="text-xs text-muted-foreground">{formatDateTime(offer.priceObtainedAt)}</p>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {alerts.map((a) => (
                        <Tag key={a.kind} tone={SERIOUS.has(a.kind) ? "bad" : "warn"}>
                          {ALERT_LABEL[a.kind]}
                        </Tag>
                      ))}
                      {!alerts.length && <span className="text-xs text-muted-foreground">Nenhum</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={alerta ? `Nenhuma oferta com “${ALERT_LABEL[alerta]}”.` : "Nenhuma oferta com esses filtros."}>
          {!exemplos && "As ofertas de exemplo ficam fora desta lista; marque “Incluir ofertas de exemplo” para vê-las."}
        </EmptyState>
      )}
    </div>
  );
}
