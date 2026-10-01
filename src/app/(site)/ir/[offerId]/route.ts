import { NextResponse, type NextRequest } from "next/server";

import { isAutomated, snapshotOf } from "@/lib/analytics/sanitize";
import { recordEvent } from "@/lib/analytics/store";
import { findCatalogProduct, getOutboundTarget } from "@/lib/catalog/public";
import { getDb } from "@/lib/db";

/**
 * Saída para a loja. Só redireciona para o link salvo da oferta (validado no
 * cadastro pelo domínio da loja) — nunca para um endereço vindo da requisição,
 * então não há redirecionamento aberto. Registra o clique sem dados pessoais.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/ir/[offerId]">) {
  const { offerId } = await ctx.params;
  const id = Number(offerId);
  const target = Number.isInteger(id) && id > 0 ? getOutboundTarget(id) : null;
  if (!target) return NextResponse.redirect(new URL("/", request.url), 302);

  if (!isAutomated(request.headers)) {
    const item = await findCatalogProduct(String(target.product.id));
    if (item) {
      const pub = item.offers.find((o) => o.id === String(id));
      recordEvent(getDb(), {
        at: new Date().toISOString(),
        type: "clique",
        ...snapshotOf(item),
        store: target.store.id,
        price: pub?.price ?? undefined,
        hasLink: target.isAffiliate,
      });
    }
  }
  const destination = target.url ?? new URL(`/ir/${id}/aviso`, request.url).toString();
  const res = NextResponse.redirect(destination, 302);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
