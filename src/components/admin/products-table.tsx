"use client";

import { useState } from "react";
import Link from "next/link";

import { setProductsActiveAction } from "@/app/admin/actions";
import { ALERT_LABEL } from "@/lib/domain/alerts";
import type { ProductRow } from "@/lib/admin/product-list";
import { formatGrams, SPECIES_LABEL } from "@/lib/catalog/vocab";
import { cn } from "@/lib/utils";

import { brl, btn, DemoBadge, formatDateTime, Tag } from "./ui";

/** Tabela de produtos com seleção e ativar/desativar em lote. */
export function ProductsTable({ rows, returnTo, sortHeader }: { rows: ProductRow[]; returnTo: string; sortHeader: Record<string, React.ReactNode> }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const all = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={setProductsActiveAction}>
      <input type="hidden" name="voltar" value={returnTo} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      <div className={cn("sticky top-12 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm", !selected.size && "text-muted-foreground")} aria-live="polite">
        <span className="mr-auto">{selected.size ? `${selected.size} selecionado(s)` : "Selecione produtos para ativar ou desativar em lote"}</span>
        <button type="submit" name="ativo" value="1" disabled={!selected.size} className={btn.secondary}>
          Ativar
        </button>
        <button type="submit" name="ativo" value="0" disabled={!selected.size} className={btn.secondary}>
          Desativar
        </button>
      </div>
      <div className="relative overflow-x-auto rounded-md border">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="w-9 px-3 py-2">
                <input type="checkbox" aria-label="Selecionar todos" checked={all} onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))} className="size-3.5 accent-foreground" />
              </th>
              <th className="px-2 py-2 font-medium">{sortHeader.nome}</th>
              <th className="px-2 py-2 font-medium">{sortHeader.peso}</th>
              <th className="px-2 py-2 font-medium">Ofertas</th>
              <th className="px-2 py-2 font-medium">Alertas</th>
              <th className="hidden px-2 py-2 font-medium lg:table-cell">{sortHeader.atualizado}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className={cn("align-top hover:bg-muted/40", selected.has(r.id) && "bg-muted/60", !r.active && "text-muted-foreground")}>
                <td className="px-3 py-2.5">
                  <input type="checkbox" aria-label={`Selecionar ${r.label}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-3.5 accent-foreground" />
                </td>
                <td className="px-2 py-2.5">
                  <Link href={`/admin/produtos/${r.id}`} className="font-medium hover:underline">
                    {r.label}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {SPECIES_LABEL[r.species as keyof typeof SPECIES_LABEL]}
                    {r.gtin && <span>· EAN {r.gtin}</span>}
                    {!r.active && <Tag>Desativado</Tag>}
                    {r.isDemo && <DemoBadge />}
                  </p>
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap tabular-nums">{formatGrams(r.weightGrams)}</td>
                <td className="px-2 py-2.5 text-xs whitespace-nowrap">
                  {r.offerCount ? (
                    <>
                      {r.pricedCount}/{r.offerCount} com preço
                      <br />
                      <span className="text-muted-foreground">menor {brl(r.bestPrice)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sem ofertas</span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-xs">
                  {r.alertKinds.length ? (
                    <Link href={`/admin/produtos/${r.id}#ofertas`} className="flex flex-wrap gap-1">
                      {r.alertKinds.slice(0, 2).map((k) => (
                        <Tag key={k} tone={k === "produto_incerto" || k.startsWith("divergencia") || k === "erro_importacao" ? "bad" : "warn"}>
                          {ALERT_LABEL[k]}
                        </Tag>
                      ))}
                      {r.alertKinds.length > 2 && <span className="text-muted-foreground">+{r.alertKinds.length - 2}</span>}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="hidden px-2 py-2.5 text-xs whitespace-nowrap text-muted-foreground lg:table-cell">{formatDateTime(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
