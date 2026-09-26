import { formatBRL } from "@/lib/format";
import type { UnitPrice } from "@/lib/pricing/unitPrice";
import { cn } from "@/lib/utils";

export function UnitPriceTag({ unitPrice, className, size = "md" }: { unitPrice: UnitPrice; className?: string; size?: "md" | "lg" }) {
  return (
    <p className={cn("font-display font-extrabold leading-none text-primary", size === "lg" ? "text-3xl" : "text-2xl", className)}>
      {formatBRL(unitPrice.value)}
      <span className="ml-0.5 text-sm font-bold text-muted-foreground">{unitPrice.label}</span>
    </p>
  );
}
