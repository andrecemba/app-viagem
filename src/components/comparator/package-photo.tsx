import Image from "next/image";

import { PackageOutlineIcon } from "@/components/icons/species-icons";
import { packageLabel } from "@/lib/comparator/labels";
import type { ComparatorItem } from "@/lib/comparator/types";
import { cn } from "@/lib/utils";

/**
 * Espaço reservado para a foto real da embalagem. Sem foto oficial verificada,
 * mostra um marcador neutro, identificado como ilustrativo, e nunca uma embalagem inventada.
 */
export function PackagePhoto({
  item,
  className,
  compact = false,
}: {
  item: Pick<ComparatorItem, "photoUrl" | "title" | "netWeightGrams" | "unitCount">;
  className?: string;
  compact?: boolean;
}) {
  if (item.photoUrl) {
    return (
      <div className={cn("relative overflow-hidden rounded-md bg-muted", className)}>
        <Image src={item.photoUrl} alt={`Embalagem de ${item.title}`} fill unoptimized className="object-contain p-3" />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={`Foto ilustrativa: embalagem oficial de ${item.title} ainda não cadastrada`}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed bg-muted text-muted-foreground",
        className,
      )}
    >
      <PackageOutlineIcon size={compact ? 26 : 34} strokeWidth={1.25} className="text-muted-foreground/70" />
      <span className="text-[0.8125rem] font-semibold text-foreground/80 tabular-nums">{packageLabel(item).split(" · ")[0]}</span>
      {!compact && <span className="px-2 text-center text-[0.6875rem] leading-tight">Foto ilustrativa</span>}
    </div>
  );
}
