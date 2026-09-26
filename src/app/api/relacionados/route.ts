import { getRelated } from "@/lib/data";

/** Itens "Aproveite e leve também" da mesma loja, para o painel pós-clique. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const produto = searchParams.get("produto");
  const loja = searchParams.get("loja") ?? undefined;
  if (!produto) return Response.json({ items: [] }, { status: 400 });
  const items = await getRelated(produto, loja, { sameStoreOnly: true, limit: 6 });
  return Response.json({ items });
}
