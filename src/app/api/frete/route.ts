import { NextResponse, type NextRequest } from "next/server";

import { rateLimited } from "@/lib/analytics/store";
import { getCatalogItem } from "@/lib/catalog/public";
import { getDb } from "@/lib/db";
import { normalizeCep } from "@/lib/domain/validation";
import { quoteShipping, type QuoteOutcome } from "@/lib/integrations/sync";

/**
 * Cotação de frete de um produto para um CEP. Só devolve valor quando a loja
 * tem integração que cota frete; o resto volta como "sem cotação".
 * As chamadas às lojas acontecem aqui, no servidor; o CEP não é gravado fora da cotação.
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`frete:${ip}`, 30)) return NextResponse.json({ erro: "Muitas consultas. Tente em um minuto." }, { status: 429 });
  const slug = request.nextUrl.searchParams.get("produto") ?? "";
  const cep = normalizeCep(request.nextUrl.searchParams.get("cep"));
  if (!cep) return NextResponse.json({ erro: "CEP inválido: use 8 dígitos." }, { status: 400 });
  const found = await getCatalogItem(slug);
  if (!found) return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });
  const db = getDb();
  const quotes: Record<string, QuoteOutcome> = {};
  await Promise.all(
    found.item.offers.map(async (o) => {
      quotes[o.id] = o.isDemo ? { status: "sem_cotacao", reason: "Oferta de exemplo: sem cotação." } : await quoteShipping(db, Number(o.id), cep);
    }),
  );
  return NextResponse.json({ cep, quotes }, { headers: { "cache-control": "no-store" } });
}
