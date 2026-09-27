"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { REGION_LABEL } from "@/config/comparator";
import { siteConfig } from "@/config/site";
import { lifeStageLabel, packageLabel, sizeLabel, speciesLabel, storeCountLabel } from "@/lib/comparator/labels";
import type { ComparatorItem, ComparatorOffer } from "@/lib/comparator/types";
import { MOCK_NOW } from "@/data/mock/random";
import { formatBRL, formatRelativeHours, formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

import { PackagePhoto } from "./package-photo";

/**
 * Comparação das ofertas de UMA embalagem exata. Outras embalagens da mesma
 * fórmula aparecem abaixo como itens separados, nunca somadas a esta lista.
 */
export function OffersSheet({
  item,
  siblings,
  onOpenChange,
  onSelect,
}: {
  item: ComparatorItem | null;
  siblings: ComparatorItem[];
  onOpenChange: (open: boolean) => void;
  onSelect: (item: ComparatorItem) => void;
}) {
  return (
    <Sheet open={item !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {item && <SheetBody item={item} siblings={siblings} onSelect={onSelect} />}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({
  item,
  siblings,
  onSelect,
}: {
  item: ComparatorItem;
  siblings: ComparatorItem[];
  onSelect: (item: ComparatorItem) => void;
}) {
  const available = item.offers.filter((o) => o.inStock);
  const unavailable = item.offers.filter((o) => !o.inStock);
  const highest = Math.max(...available.map((o) => o.price));
  const spread = highest - item.bestPrice;

  return (
    <>
      <div className="border-b p-5 pr-14">
        <div className="flex gap-4">
          <PackagePhoto item={item} compact className="h-28 w-24 shrink-0" />
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {item.brand.name}
              {item.lineName && item.lineName !== item.brand.name && <span className="font-medium"> · {item.lineName}</span>}
            </p>
            <SheetTitle className="mt-1 text-lg leading-snug font-semibold">{item.title}</SheetTitle>
            <SheetDescription asChild>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[0.8125rem] text-foreground/90">
                <dt className="text-muted-foreground">Para</dt>
                <dd>
                  {speciesLabel(item)} · {lifeStageLabel(item)}
                </dd>
                <dt className="text-muted-foreground">Porte</dt>
                <dd>{sizeLabel(item)}</dd>
                <dt className="text-muted-foreground">Sabor</dt>
                <dd>{item.flavor}</dd>
                <dt className="text-muted-foreground">Peso</dt>
                <dd className="font-semibold">{packageLabel(item)}</dd>
              </dl>
            </SheetDescription>
          </div>
        </div>
      </div>

      <section aria-labelledby="ofertas-titulo" className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="ofertas-titulo" className="font-display text-base font-semibold">
            Preços em {storeCountLabel(available.length)}
          </h2>
          <p className="text-xs text-muted-foreground">Menor preço primeiro</p>
        </div>
        <p className="mt-2 flex gap-2 rounded-md bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Preços <strong className="font-semibold text-foreground">ilustrativos</strong>, apenas para demonstrar a
            comparação. Todas as ofertas são desta mesma embalagem de {formatWeight(item.netWeightGrams)}.
          </span>
        </p>

        <ol className="mt-4 divide-y rounded-lg border">
          {available.map((offer, i) => (
            <OfferRow key={offer.id} offer={offer} rank={i + 1} best={i === 0} bestPrice={item.bestPrice} />
          ))}
          {unavailable.map((offer) => (
            <OfferRow key={offer.id} offer={offer} rank={null} best={false} bestPrice={item.bestPrice} />
          ))}
        </ol>

        {available.length > 1 && spread > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Diferença entre a oferta mais barata e a mais cara:{" "}
            <strong className="font-semibold text-foreground tabular-nums">{formatBRL(spread)}</strong>
          </p>
        )}
      </section>

      {siblings.length > 0 && (
        <section aria-labelledby="outras-embalagens" className="border-t p-5">
          <h2 id="outras-embalagens" className="font-display text-base font-semibold">
            Outras embalagens desta fórmula
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada peso é comparado separadamente. Escolha para ver os preços daquela embalagem.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {siblings.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors hover:border-foreground/40 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  <span className="font-semibold tabular-nums">{packageLabel(s)}</span>
                  <span className="text-right text-xs text-muted-foreground">
                    a partir de{" "}
                    <span className="font-semibold text-foreground tabular-nums">{formatBRL(s.bestPrice)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-auto border-t px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        Lojas com entrega ou retirada em {REGION_LABEL}. Nesta demonstração não há links de compra ativos; quando houver, o
        preço válido será sempre o da loja no momento da compra.
      </p>
    </>
  );
}

function OfferRow({
  offer,
  rank,
  best,
  bestPrice,
}: {
  offer: ComparatorOffer;
  rank: number | null;
  best: boolean;
  bestPrice: number;
}) {
  const diff = offer.price - bestPrice;
  return (
    <li className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 p-4", !offer.inStock && "bg-muted/60")}>
      <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums" aria-label={rank ? `${rank}º` : undefined}>
        {rank ?? "–"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: offer.storeColor }} />
          {offer.storeName}
          {best && (
            <span className="rounded-sm bg-brand-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold text-brand">
              Menor preço
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {offer.storeKind}
          {offer.sellerName !== offer.storeName && ` · vendido por ${offer.sellerName}`}
          {" · "}verificado {formatRelativeHours(offer.lastCheckedAt, MOCK_NOW)}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
          {!offer.inStock && <span className="font-semibold text-muted-foreground">Sem estoque</span>}
          {offer.inStock && offer.freeShipping && <span className="text-foreground/80">Frete grátis</span>}
          {offer.inStock && offer.pixPrice && (
            <span className="text-foreground/80 tabular-nums">{formatBRL(offer.pixPrice)} no Pix</span>
          )}
        </p>
      </div>
      <div className="ml-9 flex w-full items-center justify-between gap-3 sm:ml-0 sm:w-auto sm:flex-col sm:items-end sm:gap-1.5">
        <div className="sm:text-right">
          <p className={cn("font-display text-lg font-bold tabular-nums", !offer.inStock && "text-muted-foreground")}>
            {formatBRL(offer.price)}
          </p>
          {offer.inStock && diff > 0 && (
            <p className="text-[0.6875rem] text-muted-foreground tabular-nums">+{formatBRL(diff)}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!siteConfig.outboundLinksEnabled}
          title="Links de compra ainda não estão ativos"
        >
          Link em breve
        </Button>
      </div>
    </li>
  );
}
