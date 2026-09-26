import Link from "next/link";
import { Info } from "lucide-react";

import { siteConfig } from "@/config/site";

import { institutionalNav, legalNav, mainNav } from "./site-nav";
import { SiteLogo } from "./site-logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-10 flex gap-3 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p>{siteConfig.affiliateDisclaimer}</p>
        </div>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <SiteLogo />
            <p className="text-sm text-muted-foreground">
              Comparação honesta: a oferta mais barata por kg aparece primeiro, pague ela comissão ou não.
            </p>
          </div>
          <FooterColumn title="Navegue" links={mainNav} />
          <FooterColumn title="Institucional" links={institutionalNav} />
          <FooterColumn title="Legal" links={legalNav} />
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}. Nenhuma marca ou loja paga por posição.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-3 font-display text-sm font-bold">{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-muted-foreground transition hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
