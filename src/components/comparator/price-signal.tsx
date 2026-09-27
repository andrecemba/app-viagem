import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { priceSignal } from "@/lib/comparator/filters";
import type { ComparatorItem } from "@/lib/comparator/types";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Observação de preço: compara o menor preço de hoje com a média do menor preço
 * nos últimos 30 dias. ±5% = "Preço normal".
 */
export function PriceSignalTag({ item, showAverage = true, className }: { item: Pick<ComparatorItem, "bestPrice" | "avgPrice30d">; showAverage?: boolean; className?: string }) {
  const signal = priceSignal(item);
  if (signal.kind === "sem-historico") {
    return <p className={cn("text-xs text-muted-foreground", className)}>Sem histórico suficiente para comparar com a média</p>;
  }
  const { label, Icon, cls } =
    signal.kind === "abaixo"
      ? { label: `${signal.percent}% abaixo da média`, Icon: TrendingDown, cls: "bg-success-soft text-success" }
      : signal.kind === "acima"
        ? { label: `${signal.percent}% acima da média`, Icon: TrendingUp, cls: "bg-warning-soft text-warning-foreground" }
        : { label: "Preço normal", Icon: Minus, cls: "bg-muted text-foreground/80" };
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold", cls)}>
        <Icon className="size-3.5" aria-hidden /> {label}
      </span>
      {showAverage && <span className="text-xs text-muted-foreground">média de 30 dias: {formatBRL(signal.average)}</span>}
    </div>
  );
}
