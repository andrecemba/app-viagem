import { FunnelIcon } from "@/components/icons/funnel-icon";
import { FOOD_TYPES } from "@/config/taxonomy";
import { formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Brand, Product } from "@/types/catalog";

/**
 * Placeholder visual do produto (sem fotos de terceiros). Na Fase 2, usar a
 * imagem oficial vinda da API do programa de afiliados, quando os termos permitirem.
 */
export function ProductThumb({
  product,
  brand,
  className,
  size = "md",
}: {
  product: Pick<Product, "foodType" | "netWeightGrams" | "unitCount">;
  brand: Pick<Brand, "color" | "initials">;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const icon = FOOD_TYPES.find((f) => f.slug === product.foodType)?.icon ?? "dry";
  const iconSize = size === "lg" ? 72 : size === "sm" ? 28 : 44;
  return (
    <div
      className={cn("relative flex aspect-square items-center justify-center overflow-hidden rounded-xl", className)}
      style={{ background: `linear-gradient(145deg, ${brand.color}22, ${brand.color}55)` }}
    >
      <FunnelIcon icon={icon} size={iconSize} className="text-foreground/70" />
      <span
        className={cn(
          "absolute top-2 left-2 rounded-full px-1.5 py-0.5 font-display font-extrabold text-white",
          size === "sm" ? "text-[9px]" : "text-[11px]",
        )}
        style={{ backgroundColor: brand.color }}
      >
        {brand.initials}
      </span>
      {size !== "sm" && (
        <span className="absolute right-2 bottom-2 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-bold backdrop-blur">
          {formatWeight(product.netWeightGrams)}
        </span>
      )}
    </div>
  );
}
