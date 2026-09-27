import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteProductAction, setStatusAction } from "@/app/admin/actions";
import { OffersEditor } from "@/components/admin/offers-editor";
import { ProductForm, TopicsPreview } from "@/components/admin/product-form";
import { btn, Flash, formatDateTime, StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { productLabel } from "@/lib/admin/labels";
import { missingForPublish, pendingFields } from "@/lib/admin/mutations";
import { adminRepo } from "@/lib/admin/repository";
import { catalogSource } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/admin/produtos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = (await adminRepo.read()).products.find((x) => x.id === id);
  return { title: p ? productLabel(p) : "Produto" };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/admin/produtos/[id]">) {
  await requireAdmin();
  const [{ id }, sp, db] = await Promise.all([params, searchParams, adminRepo.read()]);
  const product = db.products.find((p) => p.id === id);
  if (!product) notFound();
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const missing = missingForPublish(product);
  const pending = pendingFields(product);
  const returnTo = `/admin/produtos/${product.id}`;

  const statusButton = (estado: string, label: string, primary = false) => (
    <form action={setStatusAction}>
      <input type="hidden" name="ids" value={product.id} />
      <input type="hidden" name="estado" value={estado} />
      <input type="hidden" name="voltar" value={returnTo} />
      <button type="submit" className={primary ? btn.primary : btn.secondary}>
        {label}
      </button>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <Link href="/admin/produtos" className="text-xs text-muted-foreground hover:text-foreground">
            ← Produtos
          </Link>
          <h1 className="mt-1 font-display text-xl font-semibold tracking-tight">{productLabel(product)}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge status={product.status} /> Atualizado {formatDateTime(product.updatedAt)} por {product.updatedBy.replace(/^admin:/, "")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.status !== "publicado" && statusButton("publicado", "Publicar", true)}
          {product.status !== "rascunho" && statusButton("rascunho", "Voltar a rascunho")}
          {product.status !== "oculto" && statusButton("oculto", "Ocultar")}
          {product.status === "publicado" && catalogSource() === "admin" && (
            <Link href={`/produto/${product.slug}`} target="_blank" className={btn.ghost}>
              Ver no site
            </Link>
          )}
        </div>
      </div>
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <ProductForm id={product.id} draft={product} />
          <OffersEditor product={product} />
        </div>
        <aside className="space-y-4 xl:sticky xl:top-16 xl:self-start">
          <div className="rounded-lg border p-3 text-sm">
            {missing.length ? (
              <p>
                <strong>Para publicar falta:</strong> {missing.join(", ")}.
              </p>
            ) : (
              <p className="text-emerald-800 dark:text-emerald-300">Pronto para publicar.</p>
            )}
            {pending.length > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-amber-800 dark:text-amber-300">Pendente de verificação:</span> {pending.join(", ")}.
              </p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">{product.verified ? "Dados conferidos na embalagem ou no fabricante." : "Dados ainda não conferidos na embalagem."}</p>
          </div>
          <TopicsPreview draft={product} />
          {product.status !== "publicado" && (
            <details className="rounded-lg border p-3 text-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground underline underline-offset-4">Excluir ficha</summary>
              <form action={deleteProductAction} className="mt-2 space-y-2">
                <input type="hidden" name="id" value={product.id} />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="confirmo" className="accent-foreground" /> Confirmo a exclusão (não dá para desfazer)
                </label>
                <button type="submit" className={btn.danger}>
                  Excluir
                </button>
              </form>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
