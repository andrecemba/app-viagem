import { NextResponse, type NextRequest } from "next/server";

import { rateLimited } from "@/lib/analytics/store";
import { findCatalogProduct } from "@/lib/catalog/public";
import { getDb } from "@/lib/db";
import { savePriceAlert } from "@/lib/price-alerts/store";
import { normalizeEmail, parseTargetPrice } from "@/lib/price-alerts/validate";

/** Pedido de "Avisar oferta". Valida tudo no servidor; o IP não é gravado. */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`aviso:${ip}`, 10)) return NextResponse.json({ erro: "Muitos pedidos. Tente de novo em um minuto." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 1000) throw new Error();
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ erro: "Confira o e-mail." }, { status: 400 });
  if (body.consentimento !== true) return NextResponse.json({ erro: "Marque a autorização para receber o aviso." }, { status: 400 });

  let item = null;
  if (typeof body.produto === "string" && body.produto) {
    item = await findCatalogProduct(body.produto);
    if (!item) return NextResponse.json({ erro: "Ração não encontrada." }, { status: 400 });
  }
  const target = parseTargetPrice(body.precoAlvo, item?.bestPrice ?? null);
  if (target === "invalido") return NextResponse.json({ erro: "O preço desejado precisa ser menor que o preço atual." }, { status: 400 });

  savePriceAlert(getDb(), {
    at: new Date().toISOString(),
    email,
    productId: item ? Number(item.id) : null,
    priceAtRequest: item?.bestPrice ?? null,
    targetPrice: target,
  });
  return NextResponse.json({ ok: true });
}
