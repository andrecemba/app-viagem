import { Button } from "@/components/ui/button";
import { unitPriceOf } from "@/lib/comparator/filters";
import { lifeStageLabel, packageLabel, sizeLabel, speciesLabel, storeCountLabel } from "@/lib/comparator/labels";
import type { ComparatorItem } from "@/lib/comparator/types";
import { formatBRL } from "@/lib/format";

import { PackagePhoto } from "./package-photo";

/**
 * Um cartão = uma embalagem exata (fórmula + sabor + peso). Os dados seguem
 * sempre a mesma ordem: marca e linha; espécie e fase; porte; sabor; peso;
 * menor preço ilustrativo; número de lojas.
 */
export function ProductCard({ item, onOpen }: { item: ComparatorItem; onOpen: (item: ComparatorItem) => void }) {
  const unit = unitPriceOf(item);
  const headingId = `item-${item.id}`;
  return (
    <article
      aria-labelledby={headingId}
      className="grid grid-cols-[6.5rem_1fr] gap-x-4 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/25 sm:flex sm:flex-col sm:p-0"
    >
      <PackagePhoto item={item} className="aspect-[3/4] self-start sm:m-3 sm:mb-0 sm:aspect-[4/3] sm:self-auto" />

      <div className="flex min-w-0 flex-1 flex-col sm:p-4 sm:pt-3.5">
        <p className="truncate text-[0.6875rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          {item.brand.name}
          {item.lineName && item.lineName !== item.brand.name && <span className="font-medium"> · {item.lineName}</span>}
        </p>
        <h3 id={headingId} className="mt-1 font-display text-[0.9375rem] leading-snug font-semibold text-balance">
          {item.title}
        </h3>

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.8125rem]">
          <Row label="Para">
            {speciesLabel(item)} · {lifeStageLabel(item)}
          </Row>
          <Row label="Porte">{sizeLabel(item)}</Row>
          <Row label="Sabor">{item.flavor}</Row>
          <Row label="Peso">
            <span className="font-semibold text-foreground">{packageLabel(item)}</span>
          </Row>
        </dl>

        <div className="mt-auto pt-3">
          <div className="border-t pt-3">
            <p className="text-[0.6875rem] font-medium text-muted-foreground">Menor preço ilustrativo</p>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-xl font-bold tabular-nums">{formatBRL(item.bestPrice)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatBRL(unit.value)}
                {unit.label}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Comparado em {storeCountLabel(item.storeCount)}</p>
          </div>
          <Button
            className="mt-3 w-full"
            onClick={() => onOpen(item)}
            aria-label={`Ver preços de ${item.title}, ${item.flavor}, ${packageLabel(item)}`}
          >
            Ver preços
          </Button>
        </div>
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground/90">{children}</dd>
    </>
  );
}
