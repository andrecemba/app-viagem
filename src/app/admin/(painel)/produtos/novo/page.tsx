import type { Metadata } from "next";
import Link from "next/link";

import { ProductForm } from "@/components/admin/product-form";
import { Flash, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage({ searchParams }: PageProps<"/admin/produtos/novo">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Novo produto"
        description={
          <>
            Cadastre a ração exata. Depois de salvar, adicione as ofertas das lojas.{" "}
            <Link href="/admin/produtos" className="underline underline-offset-4">
              Voltar
            </Link>
          </>
        }
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />
      <ProductForm product={null} />
    </div>
  );
}
