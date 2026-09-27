import { NextResponse, type NextRequest } from "next/server";

import { isAutomated, snapshotOf } from "@/lib/analytics/sanitize";
import { recordEvent } from "@/lib/analytics/store";
import { getOutboundOffer } from "@/lib/data";

/**
 * Saída para a loja: registra o clique (sem dados pessoais) e redireciona.
 * Com link cadastrado no admin, vai direto para a loja (302). Sem link real
 * (dados de exemplo), mostra o aviso de oferta ilustrativa.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/ir/[offerId]">) {
  const { offerId } = await ctx.params;
  const id = decodeURIComponent(offerId);
  const found = await getOutboundOffer(id);
  if (found && !isAutomated(request.headers)) {
    await recordEvent({
      at: new Date().toISOString(),
      type: "clique",
      ...snapshotOf(found.item),
      store: found.offer.storeSlug,
      price: found.offer.price,
      hasLink: Boolean(found.url),
    });
  }
  const target = found?.url ?? new URL(`/ir/${encodeURIComponent(id)}/aviso`, request.url).toString();
  const res = NextResponse.redirect(target, 302);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
