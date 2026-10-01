import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { ProductForm } from "@/components/admin/product-form";
import { brl, btn, DemoBadge, Flash, formatDateTime, Tag } from "@/components/admin/ui";
import { StoreLogo } from "@/components/icons/store-logo";
import { requireAdmin } from "@/lib/admin/auth";
import { offerRows } from "@/lib/admin/data";
import { getDb } from "@/lib/db";
import { ALERT_LABEL } from "@/lib/domain/alerts";
import { getProduct, productName } from "@/lib/domain/products";

export async function generateMetadata({ params }: PageProps<"/admin/produtos/[id]">): Promise<Metadata> {
  const p = getProduct(getDb(), Number((await params).id));
  return { title: p ? productName(p) : "Produto" };
}

export default async function AdminProductPage({ params, searchParams }: PageProps<"/admin/produtos/[id]">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const db = getDb();
  const product = getProduct(db, Number(id));
  if (!product) notFound();
  const rows = offerRows(db, { productId: product.id });
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <div className="space-y-4">
      <div className="border-b pb-4">
        <Link href="/admin/produtos" className="text-xs text-muted-foreground hover:text-foreground">
          ← Produtos
        </Link>
        <h1 className="mt-1 font-display text-xl font-semibold tracking-tight">{productName(product)}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {product.active ? <Tag tone="good">Ativo</Tag> : <Tag>Desativado</Tag>}
          {product.isDemo && <DemoBadge />}
          Atualizado {formatDateTime(product.updatedAt)}
          {product.active && (
            <Link href={`/produto/${product.slug}`} target="_blank" className="underline underline-offset-4">
              Ver no site
            </Link>
          )}
        </p>
      </div>
      <Flash aviso={one(sp.aviso)} erro={one(sp.erro)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <ProductForm product={product} />
        <section id="ofertas" aria-labelledby="ofertas-titulo" className="space-y-3 xl:sticky xl:top-16 xl:self-start">
          <div className="flex items-center justify-between gap-2">
            <h2 id="ofertas-titulo" className="font-display text-sm font-semibold">
              Ofertas · {rows.length}
            </h2>
            <Link href={`/admin/produtos/${product.id}/nova-oferta`} className={btn.primary}>
              <Plus className="size-4" aria-hidden /> Nova oferta
            </Link>
          </div>
          {rows.length ? (
            <ul className="divide-y rounded-lg border">
              {rows.map(({ offer, store, alerts }) => (
                <li key={offer.id} className={offer.active ? "" : "opacity-60"}>
                  <Link href={`/admin/ofertas/${offer.id}`} className="block px-3 py-2.5 hover:bg-muted/50">
                    <span className="flex items-center gap-2">
                      <StoreLogo name={store.name} color={store.color} logo={store.logoUrl} size={22} />
                      <span className="font-medium">{store.name}</span>
                      <span className="ml-auto font-display font-semibold tabular-nums">{offer.price != null ? brl(offer.price) : "sem preço"}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {offer.dataSource === "manual" ? "Manual" : offer.dataSource === "api" ? "API" : "Arquivo"} · preço de {formatDateTime(offer.priceObtainedAt)}
                      {!offer.active && <Tag>Desativada</Tag>}
                      {offer.isDemo && <DemoBadge />}
                      {Object.keys(offer.overrides).length > 0 && <Tag>Com correção manual</Tag>}
                    </span>
                    {alerts.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {alerts.map((a) => (
                          <Tag key={a.kind} tone={a.kind === "produto_incerto" || a.kind.startsWith("divergencia") || a.kind === "erro_importacao" ? "bad" : "warn"}>
                            {ALERT_LABEL[a.kind]}
                          </Tag>
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhuma oferta. Cole a URL do anúncio em <strong>Nova oferta</strong>.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
