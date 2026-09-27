import Link from "next/link";
import { Flame } from "lucide-react";

import type { Deal } from "@/lib/analytics/top-deals";
import { unitPriceOf } from "@/lib/comparator/filters";
import { formatBRL, formatWeight } from "@/lib/format";

import { BrandSwatch } from "./brand-swatch";

/**
 * Painel "Top descontos do dia". No computador fica ao lado da busca (espaço que
 * estava vazio); no celular vira uma faixa com rolagem lateral, sem empurrar os filtros.
 */
export function TopDeals({ deals, basedOnDemand }: { deals: Deal[]; basedOnDemand: boolean }) {
  if (!deals.length) return null;
  return (
    <section aria-labelledby="top-descontos" className="min-w-0 lg:rounded-lg lg:border lg:bg-card lg:p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="top-descontos" className="flex items-center gap-1.5 font-display text-base font-bold">
          <Flame className="size-4 text-destructive" aria-hidden /> Top descontos do dia
        </h2>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {basedOnDemand ? "Entre as 10 rações mais procuradas no site" : "Entre as rações mais procuradas e comparadas"}, as que estão
        mais baratas que a média dos últimos 30 dias.
      </p>
      <ol className="-mx-4 mt-3 flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0">
        {deals.map(({ item, percent, average }) => {
          const unit = unitPriceOf(item);
          return (
            <li key={item.id} className="w-60 shrink-0 snap-start lg:w-auto">
              <Link
                href={`/produto/${item.slug}`}
                className="flex h-full items-center gap-3 rounded-md border bg-card p-2.5 transition-colors hover:border-foreground/40 lg:border-transparent lg:bg-transparent lg:p-2 lg:hover:border-border lg:hover:bg-muted/50"
              >
                <span className="flex w-12 shrink-0 flex-col items-center rounded-md bg-success-soft py-1.5 text-success">
                  <span className="font-display text-base leading-none font-bold tabular-nums">−{percent}%</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    <BrandSwatch brand={item.brand} size={14} /> <span className="truncate">{item.brand.name}</span>
                  </span>
                  <span className="block truncate text-sm font-medium lg:line-clamp-2 lg:whitespace-normal">
                    {item.title}
                    {item.flavor && ` · ${item.flavor}`} · {formatWeight(item.netWeightGrams)}
                  </span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    <strong className="text-sm text-foreground">{formatBRL(item.bestPrice!)}</strong>
                    {unit && ` · ${formatBRL(unit.value)}${unit.label}`} · média {formatBRL(average)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
