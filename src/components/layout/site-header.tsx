import Link from "next/link";

import { topCategories } from "@/config/site";
import { cn } from "@/lib/utils";

import { MobileMenu } from "./mobile-menu";
import { mainNav } from "./site-nav";
import { SiteLogo } from "./site-logo";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <MobileMenu />
        <SiteLogo />
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Principal">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto md:ml-2">
          <ThemeToggle />
        </div>
      </div>
      {/* Abas de categorias do topo — estrutura extensível (Areia e higiene, Mercado...). */}
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 scrollbar-none">
        {topCategories.map((c) =>
          c.href ? (
            <Link
              key={c.slug}
              href={c.href}
              className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground"
            >
              {c.label}
            </Link>
          ) : (
            <span
              key={c.slug}
              aria-disabled
              className={cn("shrink-0 rounded-full border border-dashed px-3.5 py-1.5 text-xs font-semibold text-muted-foreground")}
            >
              {c.label} <span className="font-normal">· em breve</span>
            </span>
          ),
        )}
      </div>
    </header>
  );
}
