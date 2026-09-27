"use client";

import { useState } from "react";
import Link from "next/link";

import { setStatusAction } from "@/app/admin/actions";
import { FOOD_TYPE_LABEL, LIFE_STAGE_LABEL, SIZE_LABEL, SPECIES_LABEL, formatGrams } from "@/lib/admin/labels";
import type { ProductRow } from "@/lib/admin/product-list";
import { cn } from "@/lib/utils";

import { brl, btn, DemoBadge, SeverityBadge, StatusBadge } from "./ui";

/** Tabela de produtos com seleção múltipla e ações em lote. */
export function ProductsTable({ rows, returnTo, sortHeader }: { rows: ProductRow[]; returnTo: string; sortHeader: Record<string, React.ReactNode> }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={setStatusAction}>
      <input type="hidden" name="voltar" value={returnTo} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}

      <div
        className={cn(
          "sticky top-12 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm",
          selected.size === 0 && "text-muted-foreground",
        )}
        aria-live="polite"
      >
        <span className="mr-auto">{selected.size ? `${selected.size} selecionado(s)` : "Selecione produtos para ações em lote"}</span>
        <button type="submit" name="estado" value="publicado" disabled={!selected.size} className={btn.secondary}>
          Publicar
        </button>
        <button type="submit" name="estado" value="rascunho" disabled={!selected.size} className={btn.secondary}>
          Voltar a rascunho
        </button>
        <button type="submit" name="estado" value="oculto" disabled={!selected.size} className={btn.secondary}>
          Ocultar
        </button>
      </div>

      <div className="relative overflow-x-auto rounded-md border">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="w-9 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                  className="size-3.5 accent-foreground"
                />
              </th>
              <th scope="col" className="px-2 py-2 font-medium">{sortHeader.nome}</th>
              <th scope="col" className="hidden px-2 py-2 font-medium md:table-cell">Para</th>
              <th scope="col" className="px-2 py-2 font-medium">{sortHeader.peso}</th>
              <th scope="col" className="hidden px-2 py-2 font-medium xl:table-cell">Ofertas</th>
              <th scope="col" className="px-2 py-2 font-medium">Estado</th>
              <th scope="col" className="px-2 py-2 font-medium">{sortHeader.alertas}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className={cn("align-top hover:bg-muted/40", selected.has(r.id) && "bg-muted/60")}>
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${r.label}`}
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="size-3.5 accent-foreground"
                  />
                </td>
                <td className="px-2 py-2.5">
                  <Link href={`/admin/produtos/${r.id}`} className="font-medium hover:underline">
                    {r.brand ?? "Sem marca"} · {r.formula ?? "Sem fórmula"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {r.line && r.line !== r.brand ? `${r.line} · ` : ""}
                    Sabor: {r.flavor ?? <span className="text-amber-800 dark:text-amber-300">não informado</span>} ·{" "}
                    {r.foodType ? FOOD_TYPE_LABEL[r.foodType as keyof typeof FOOD_TYPE_LABEL] : "tipo não informado"}
                  </p>
                </td>
                <td className="hidden px-2 py-2.5 text-xs md:table-cell">
                  {r.species ? SPECIES_LABEL[r.species as keyof typeof SPECIES_LABEL] : "—"}
                  <br />
                  <span className="text-muted-foreground">
                    {r.lifeStage ? LIFE_STAGE_LABEL[r.lifeStage as keyof typeof LIFE_STAGE_LABEL] : "—"}
                    {r.species === "caes" && r.size ? ` · ${SIZE_LABEL[r.size as keyof typeof SIZE_LABEL]}` : ""}
                  </span>
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap tabular-nums">
                  {r.weightGrams ? formatGrams(r.weightGrams) : <span className="text-xs text-amber-800 dark:text-amber-300">Pendente</span>}
                </td>
                <td className="hidden px-2 py-2.5 text-xs xl:table-cell">
                  {r.offerCount ? (
                    <>
                      {r.activeOfferCount}/{r.offerCount} ativas {r.demoOffers && <DemoBadge />}
                      <br />
                      <span className="text-muted-foreground">menor {brl(r.bestPrice)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sem ofertas</span>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  <StatusBadge status={r.status} />
                  {r.pendingFields > 0 && <p className="mt-1 text-[0.6875rem] whitespace-nowrap text-muted-foreground">{r.pendingFields} pendentes</p>}
                </td>
                <td className="px-2 py-2.5">
                  {r.maxSeverity ? (
                    <Link href={`/admin/revisao?produto=${r.id}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <SeverityBadge severity={r.maxSeverity} />
                      <span className="text-xs text-muted-foreground tabular-nums">{r.openAlerts}</span>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Nenhum</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
