"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { topCategories } from "@/config/site";

import { institutionalNav, mainNav } from "./site-nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação principal</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-base font-semibold hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t px-6 pt-4">
          <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Categorias</p>
          <ul className="space-y-2 text-sm">
            {topCategories.map((c) => (
              <li key={c.slug} className="flex items-center justify-between">
                <span className={c.status === "active" ? "font-semibold" : "text-muted-foreground"}>{c.label}</span>
                {c.status === "coming_soon" && <span className="text-xs text-muted-foreground">em breve</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 border-t px-3 pt-4 pb-6">
          {institutionalNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
