import { CalendarCheck, TrendingDown, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { OfferBadge } from "@/lib/pricing/badges";

const icons = {
  drop: TrendingDown,
  lowest30: CalendarCheck,
  freeShipping: Truck,
};

export function OfferBadges({ badges, className }: { badges: OfferBadge[]; className?: string }) {
  if (!badges.length) return null;
  return (
    <div className={className ?? "flex flex-wrap gap-1.5"}>
      {badges.map((b) => {
        const Icon = icons[b.kind];
        return (
          <Badge key={b.kind} variant={b.kind === "freeShipping" ? "secondary" : "success"}>
            <Icon aria-hidden />
            {b.label}
          </Badge>
        );
      })}
    </div>
  );
}
