import { QrCode, Repeat } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import type { Offer } from "@/types/catalog";

/** Preço Pix e de assinatura aparecem como selos; o preço padrão é sempre o principal. */
export function PriceExtras({ offer }: { offer: Pick<Offer, "pixPrice" | "subscriptionPrice"> }) {
  if (!offer.pixPrice && !offer.subscriptionPrice) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {offer.pixPrice && (
        <Badge variant="outline">
          <QrCode aria-hidden /> Pix {formatBRL(offer.pixPrice)}
        </Badge>
      )}
      {offer.subscriptionPrice && (
        <Badge variant="outline">
          <Repeat aria-hidden /> Assinatura {formatBRL(offer.subscriptionPrice)}
        </Badge>
      )}
    </div>
  );
}
