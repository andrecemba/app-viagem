import type { Metadata } from "next";
import Link from "next/link";

import { EMPTY_DRAFT, ProductForm } from "@/components/admin/product-form";
import { Flash, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Cadastrar ração" };

export default async function NewProductPage({ searchParams }: PageProps<"/admin/produtos/novo">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Cadastrar ração"
        description={
          <>
            Uma ficha por embalagem exata. Preencha só o que conferiu; o resto fica “Pendente de verificação”. Depois de salvar, cadastre os preços das
            lojas. <Link href="/admin/produtos" className="underline underline-offset-4">Voltar para a lista</Link>
          </>
        }
      />
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />
      <ProductForm id={null} draft={EMPTY_DRAFT} />
    </div>
  );
}
