"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { ExternalLink, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";
import type { RelatedItemView } from "@/lib/data/types";

import { outboundLinkProps } from "./outbound";

export interface DrawerRequest {
  productSlug: string;
  productName: string;
  storeId: string;
  storeName: string;
}

const DrawerContext = createContext<(req: DrawerRequest) => void>(() => {});

export function useRelatedDrawer() {
  return useContext(DrawerContext);
}

/**
 * Painel "Aproveite e leve também": abre na aba do nosso site depois que a loja
 * abriu em nova aba. Não é modal, não tem contagem regressiva e nunca atrasa o redirect.
 */
export function RelatedDrawerProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<DrawerRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RelatedItemView[] | null>(null);
  const controller = useRef<AbortController | null>(null);

  const openDrawer = useCallback((req: DrawerRequest) => {
    setRequest(req);
    setItems(null);
    setOpen(true);
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    const qs = new URLSearchParams({ produto: req.productSlug, loja: req.storeId });
    fetch(`/api/relacionados?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items: RelatedItemView[] }) => setItems(data.items))
      .catch((err) => {
        if (err?.name !== "AbortError") setItems([]);
      });
  }, []);

  const value = useMemo(() => openDrawer, [openDrawer]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <Sheet open={open} onOpenChange={setOpen} modal={false}>
        <SheetContent side="right" modal={false} className="gap-0" onInteractOutside={(e) => e.preventDefault()}>
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" aria-hidden />
              Aproveite e leve também
            </SheetTitle>
            <SheetDescription>
              {request ? (
                <>
                  A oferta de <strong className="text-foreground">{request.productName}</strong> abriu em uma nova aba. Itens
                  que combinam, na mesma loja ({request.storeName}), para aproveitar o carrinho e o frete:
                </>
              ) : null}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-5">
            {items === null ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                Não encontramos itens relevantes nesta loja agora.
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-muted-foreground">{item.categoryLabel}</p>
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="mt-0.5 text-sm font-bold">{formatBRL(item.price)}</p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <a {...outboundLinkProps(item.offerId)} aria-label={`Ver ${item.name} ${item.store.preposition} ${item.store.name}`}>
                        Ver <ExternalLink />
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <SheetFooter className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Sugestões — podemos receber comissão por compras.
            </p>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </DrawerContext.Provider>
  );
}
