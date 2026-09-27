import Link from "next/link";

import { AdminMobileNav, AdminSidebarNav, type NavItem } from "@/components/admin/admin-nav";
import { DemoBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { adminRepo } from "@/lib/admin/repository";

import { logoutAction } from "../actions";

export default async function PainelLayout({ children }: LayoutProps<"/admin">) {
  const { email } = await requireAdmin();
  const db = await adminRepo.read();
  const open = db.alerts.filter((a) => a.status === "aberto");
  const urgent = open.filter((a) => a.severity === "critica" || a.severity === "alta").length;

  const items: NavItem[] = [
    { href: "/admin", label: "Visão geral" },
    { href: "/admin/produtos", label: "Produtos", count: db.products.length, countTone: "neutral" },
    { href: "/admin/ofertas", label: "Ofertas", count: db.offers.length, countTone: "neutral" },
    { href: "/admin/revisao", label: "Fila de revisão", count: urgent || open.length, countTone: urgent ? "alert" : "neutral" },
    { href: "/admin/execucoes", label: "Execuções" },
    { href: "/admin/lojas", label: "Lojas e integrações" },
  ];

  const account = (
    <div className="space-y-2 text-sm">
      <p className="truncate text-muted-foreground" title={email}>
        {email}
      </p>
      <form action={logoutAction}>
        <button type="submit" className="font-medium underline underline-offset-4">
          Sair
        </button>
      </form>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex h-12 items-center gap-3 px-4 lg:px-6">
          <AdminMobileNav items={items} footer={account} />
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-display text-[0.9375rem] font-bold">Ração Certa</span>
            <span className="text-xs text-muted-foreground">Administração</span>
          </Link>
          {db.settings.demoMode && (
            <span className="hidden sm:inline-flex">
              <DemoBadge />
            </span>
          )}
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground" target="_blank" rel="noopener">
              Ver site
            </Link>
            <div className="hidden items-center gap-3 lg:flex">
              <span className="max-w-48 truncate text-muted-foreground">{email}</span>
              <form action={logoutAction}>
                <button type="submit" className="font-medium hover:underline">
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
        {db.settings.demoMode && (
          <p className="border-t bg-violet-50 px-4 py-1.5 text-xs text-violet-950 lg:px-6 dark:bg-violet-950 dark:text-violet-100">
            <strong>Modo de demonstração ligado.</strong> Ofertas, preços e execuções marcados com “Demonstração” são fictícios e nunca
            vão para o site. Os 20 produtos são reais.
          </p>
        )}
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r px-3 py-5 lg:block">
          <AdminSidebarNav items={items} />
        </aside>
        <main id="conteudo" className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </>
  );
}
