import Link from "next/link";
import { Info } from "lucide-react";

import { siteConfig } from "@/config/site";

import { institutionalNav, legalNav, mainNav } from "./site-nav";
import { SiteLogo } from "./site-logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="mb-10 flex gap-2.5 border-b pb-8 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {siteConfig.outboundLinksEnabled
            ? siteConfig.affiliateDisclaimer
            : "Versão de demonstração: produtos e lojas de exemplo, preços ilustrativos e nenhum link de compra ativo. Quando houver links de afiliado, isso será informado aqui e em cada oferta."}
        </p>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <SiteLogo />
            <p className="text-sm text-muted-foreground">
              Compare o preço da mesma embalagem de ração em lojas que atendem Curitiba e região.
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
