import Link from "next/link";

import { MobileMenu } from "./mobile-menu";
import { mainNav } from "./site-nav";
import { SiteLogo } from "./site-logo";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <MobileMenu />
        <SiteLogo />
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Principal">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto md:ml-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
