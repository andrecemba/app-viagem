"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { defaultItem, unitPriceOf, type ItemGroup } from "@/lib/comparator/filters";
import { itemTopics, packageLabel, storeCountLabel } from "@/lib/comparator/labels";
import { formatBRL, formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

import { BrandSwatch } from "./brand-swatch";
import { PackagePhoto } from "./package-photo";
import { PriceSignalTag } from "./price-signal";

const CARD_TOPICS = new Set(["para", "porte", "tipo", "sabor", "indicacoes", "grao", "veterinario"]);

/**
 * Um cartão = uma fórmula e sabor. Os pesos aparecem como opções no próprio
 * cartão; preço, R$/kg e observação são sempre da embalagem escolhida.
 */
export function FamilyCard({ group }: { group: ItemGroup }) {
  const [selectedId, setSelectedId] = useState(() => defaultItem(group).id);
  const item = group.all.find((i) => i.id === selectedId) ?? defaultItem(group);
  const unit = unitPriceOf(item);
  const topics = itemTopics(item).filter((t) => CARD_TOPICS.has(t.key) && t.value);
  const matching = new Set(group.items.map((i) => i.id));
  const headingId = `familia-${group.family}`;

  return (
    <article aria-labelledby={headingId} className="flex h-full flex-col rounded-lg border bg-card transition-colors hover:border-foreground/25">
      <Link href={`/produto/${item.slug}`} tabIndex={-1} aria-hidden className="m-3 mb-0 block">
        <PackagePhoto item={item} className="aspect-[16/7] sm:aspect-[16/10]" />
      </Link>
      <div className="flex flex-1 flex-col p-4 pt-3.5">
        <p className="flex items-center gap-2 text-[0.6875rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          <BrandSwatch brand={item.brand} size={20} />
          <span className="truncate">
            {item.brand.name}
            {item.lineName && item.lineName !== item.brand.name && <span className="font-medium"> · {item.lineName}</span>}
          </span>
        </p>
        <h3 id={headingId} className="mt-1.5 font-display text-[0.9375rem] leading-snug font-semibold text-balance">
          <Link href={`/produto/${item.slug}`} className="hover:underline hover:underline-offset-4">
            {item.title}
          </Link>
        </h3>

        <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-[0.8125rem]">
          {topics.map((t) => (
            <div key={t.key} className="contents">
              <dt className="text-muted-foreground">{t.label}</dt>
              <dd className="min-w-0 text-foreground/90">{t.value}</dd>
            </div>
          ))}
        </dl>

        <fieldset className="mt-3">
          <legend className="text-[0.8125rem] text-muted-foreground">Peso</legend>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {group.all.map((i) => (
              <button
                key={i.id}
                type="button"
                aria-pressed={i.id === item.id}
                onClick={() => setSelectedId(i.id)}
                title={matching.has(i.id) ? undefined : "Fora dos filtros escolhidos"}
                className={cn(
                  "rounded-md border px-2 py-1 text-[0.8125rem] font-semibold tabular-nums transition-colors",
                  i.id === item.id ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40",
                  !matching.has(i.id) && i.id !== item.id && "border-dashed text-muted-foreground",
                )}
              >
                {i.unitCount ? packageLabel(i).split(" · ")[1] : formatWeight(i.netWeightGrams)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-auto pt-4">
          <div className="border-t pt-3">
            {item.bestPrice == null ? (
              <>
                <p className="text-[0.6875rem] font-medium text-muted-foreground">Menor preço</p>
                <p className="text-sm font-medium">Sem ofertas ativas</p>
              </>
            ) : (
              <>
                <p className="text-[0.6875rem] font-medium text-muted-foreground">Menor preço · {storeCountLabel(item.storeCount)}</p>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-xl font-bold tabular-nums">{formatBRL(item.bestPrice)}</span>
                  {unit && (
                    <span className="text-sm font-semibold text-foreground/80 tabular-nums">
                      {formatBRL(unit.value)}
                      {unit.label}
                    </span>
                  )}
                </p>
                <PriceSignalTag item={item} className="mt-1.5" />
              </>
            )}
          </div>
          <Link
            href={`/produto/${item.slug}`}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            aria-label={`Ver preços de ${item.brand.name} ${item.title}${item.flavor ? `, ${item.flavor}` : ""}, ${packageLabel(item)}`}
          >
            Ver preços nas lojas <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
