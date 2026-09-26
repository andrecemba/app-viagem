import { ExternalLink } from "lucide-react";

import { StoreMark } from "@/components/icons/store-mark";
import { outboundLinkProps } from "@/components/offers/outbound";
import { formatBRL } from "@/lib/format";
import type { RelatedItemView } from "@/lib/data/types";

/** "Compre junto" — carrossel horizontal com rolagem nativa (acessível por teclado e toque). */
export function RelatedCarousel({ items }: { items: RelatedItemView[] }) {
  if (!items.length) return null;
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-none">
      <ul className="flex snap-x snap-mandatory gap-3">
        {items.map((item) => (
          <li key={item.id} className="w-56 shrink-0 snap-start">
            <a
              {...outboundLinkProps(item.offerId)}
              className="flex h-full flex-col gap-2 rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="w-fit rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                {item.categoryLabel}
              </span>
              <span className="line-clamp-2 text-sm leading-snug font-semibold">{item.name}</span>
              <span className="mt-auto text-lg font-extrabold">{formatBRL(item.price)}</span>
              <span className="flex items-center justify-between text-xs text-muted-foreground">
                <StoreMark store={item.store} className="font-medium" />
                <ExternalLink className="size-3.5" aria-hidden />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
