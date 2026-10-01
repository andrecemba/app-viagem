import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { btn, Flash, input } from "@/components/admin/ui";
import { getAdminSession } from "@/lib/admin/auth";
import { isAdminConfigured } from "@/lib/admin/session";

import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/entrar">) {
  if (await getAdminSession()) redirect("/admin");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const configured = isAdminConfigured();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <p className="font-display text-lg font-bold">Ração Certa</p>
        <h1 className="mt-1 text-sm text-muted-foreground">Área administrativa · acesso restrito</h1>

        <div className="mt-6 rounded-lg border p-5">
          {configured ? (
            <form action={loginAction} className="space-y-4">
              <input type="hidden" name="voltar" value={one(sp.voltar) ?? "/admin"} />
              <Flash erro={one(sp.erro)} />
              <label className="block space-y-1 text-sm">
                <span className="font-medium">E-mail</span>
                <input name="email" type="email" autoComplete="username" required className={input + " h-9"} />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Senha</span>
                <input name="senha" type="password" autoComplete="current-password" required className={input + " h-9"} />
              </label>
              <button type="submit" className={btn.primary + " h-9 w-full"}>
                Entrar
              </button>
            </form>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-medium">Acesso administrativo não configurado.</p>
              <p className="text-muted-foreground">
                Por segurança o painel fica fechado até o servidor ter <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD_HASH</code> e{" "}
                <code>ADMIN_SESSION_SECRET</code>. Veja o README.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
