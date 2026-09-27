"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { btn } from "./ui";

/** No celular, a barra lateral de filtros vira um painel aberto por botão. */
export function MobileFilters({ count, resultCount, children }: { count: number; resultCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className={btn.secondary + " lg:hidden"} aria-label={`Abrir filtros${count ? ` (${count} aplicados)` : ""}`}>
          <SlidersHorizontal className="size-4" aria-hidden /> Filtros{count > 0 && ` (${count})`}
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88%] gap-0 overflow-y-auto sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>As opções mostram quantos produtos restam.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-5 pb-4">{children}</div>
        <div className="sticky bottom-0 z-10 border-t bg-background p-4">
          <button type="button" className={btn.primary + " h-10 w-full"} onClick={() => setOpen(false)}>
            Ver {resultCount} {resultCount === 1 ? "produto" : "produtos"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
