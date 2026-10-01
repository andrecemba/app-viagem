import Link from "next/link";

import { AdminMobileNav, AdminSidebarNav, type NavItem } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin/auth";
import { offerRows } from "@/lib/admin/data";
import { getDb } from "@/lib/db";

import { logoutAction } from "../actions";

export default async function PainelLayout({ children }: LayoutProps<"/admin">) {
  const { email } = await requireAdmin();
  const db = getDb();
  const products = (db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n;
  const serious = offerRows(db).filter(
    (r) => r.offer.active && !r.offer.isDemo && r.alerts.some((a) => ["produto_incerto", "divergencia_peso", "divergencia_sabor", "erro_importacao", "afiliado_invalido"].includes(a.kind)),
  ).length;

  const items: NavItem[] = [
    { href: "/admin/produtos", label: "Produtos", count: products, countTone: "neutral" },
    { href: "/admin/ofertas", label: "Ofertas e alertas", count: serious, countTone: "alert" },
    { href: "/admin/lojas", label: "Lojas" },
    { href: "/admin/dados", label: "Dados" },
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
          <Link href="/admin/produtos" className="flex items-baseline gap-2">
            <span className="font-display text-[0.9375rem] font-bold">Ração Certa</span>
            <span className="text-xs text-muted-foreground">Administração</span>
          </Link>
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
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-48 shrink-0 border-r px-3 py-5 lg:block">
          <AdminSidebarNav items={items} />
        </aside>
        <main id="conteudo" className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </>
  );
}
