"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  count?: number;
  countTone?: "alert" | "neutral";
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active ? "bg-foreground font-medium text-background" : "text-foreground/80 hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
              {item.count != null && item.count > 0 && (
                <span
                  className={cn(
                    "min-w-5 rounded px-1 text-center text-[0.6875rem] font-semibold tabular-nums",
                    active ? "bg-background/20 text-background" : item.countTone === "alert" ? "bg-red-600 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminSidebarNav({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Administração" className="hidden lg:block">
      <NavList items={items} />
    </nav>
  );
}

export function AdminMobileNav({ items, footer }: { items: NavItem[]; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="-ml-1 rounded-md p-1.5 hover:bg-muted lg:hidden" aria-label="Abrir menu da administração">
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Administração</SheetTitle>
          <SheetDescription className="sr-only">Navegação da área administrativa</SheetDescription>
        </SheetHeader>
        <nav aria-label="Administração" className="px-3">
          <NavList items={items} onNavigate={() => setOpen(false)} />
        </nav>
        <div className="mt-6 border-t px-5 py-4">{footer}</div>
      </SheetContent>
    </Sheet>
  );
}
