import Link from "next/link";
import { PackageOpen } from "lucide-react";

import { StoreMark } from "@/components/icons/store-mark";
import { OutboundOfferButton } from "@/components/offers/outbound-offer-button";
import { formatBRL } from "@/lib/format";
import type { MonthlyKit } from "@/lib/data/types";

export function MonthlyKitCard({ kit }: { kit: MonthlyKit }) {
  return (
    <div className="rounded-3xl border bg-gradient-to-br from-accent/70 to-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <PackageOpen className="size-5" aria-hidden />
        </span>
        <div>
          <h3 className="text-xl font-extrabold">Kit do mês</h3>
          <p className="text-sm text-muted-foreground">O básico do mês, somado. Cada item abre na loja indicada.</p>
        </div>
      </div>
      <ul className="divide-y rounded-2xl border bg-card">
        {kit.items.map((item) => (
          <li key={item.offerId} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary uppercase">{item.role}</p>
              {item.href ? (
                <Link href={item.href} className="line-clamp-1 text-sm font-semibold hover:text-primary">
                  {item.name}
                </Link>
              ) : (
                <p className="line-clamp-1 text-sm font-semibold">{item.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                <StoreMark store={item.store} className="font-medium" />
              </p>
            </div>
            <p className="font-extrabold tabular-nums">{formatBRL(item.price)}</p>
            <OutboundOfferButton offerId={item.offerId} label="Ver" size="sm" variant="outline" />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between px-1">
        <span className="font-semibold text-muted-foreground">Total estimado</span>
        <span className="text-2xl font-black">{formatBRL(kit.total)}</span>
      </div>
    </div>
  );
}
