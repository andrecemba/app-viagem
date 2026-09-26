import type {
  ComplementaryOffer,
  ComplementaryProduct,
  ComplementaryRule,
  ComplementCategorySlug,
  FoodTypeSlug,
  LifeStageSlug,
  SpeciesSlug,
} from "@/types/catalog";

export interface RelatedContext {
  species: SpeciesSlug;
  foodType: FoodTypeSlug;
  lifeStages: LifeStageSlug[];
}

export interface RankedRelated {
  item: ComplementaryProduct;
  offer: ComplementaryOffer;
  relevance: number;
  sameStore: boolean;
  expectedCommission: number;
  score: number;
}

export interface RankRelatedOptions {
  /** Loja da oferta principal (prioriza a mesma loja: janela de rastreio + carrinho único). */
  storeId?: string;
  /** Se true, só itens da mesma loja (usado no painel pós-clique). */
  sameStoreOnly?: boolean;
  limit?: number;
  maxPerCategory?: number;
}

const SAME_STORE_BONUS = 1.25;

const intersects = <T,>(a: T[], b: T[]) => a.some((x) => b.includes(x));

/** Relevância de cada categoria complementar para o produto principal (máximo entre as regras). */
export function categoryRelevance(ctx: RelatedContext, rules: ComplementaryRule[]) {
  const map = new Map<ComplementCategorySlug, number>();
  for (const rule of rules) {
    if (rule.species !== ctx.species || !rule.foodTypes.includes(ctx.foodType)) continue;
    if (rule.lifeStages.length && !intersects(rule.lifeStages, ctx.lifeStages)) continue;
    for (const s of rule.suggest) map.set(s.category, Math.max(map.get(s.category) ?? 0, s.relevance));
  }
  return map;
}

/**
 * "Compre junto": 1) filtro obrigatório de relevância (espécie, fase, estoque);
 * 2) mesma loja quando possível; 3) pontuação = relevância × comissão esperada;
 * 4) diversidade (máx. 2 por categoria).
 */
export function rankRelated(
  ctx: RelatedContext,
  items: ComplementaryProduct[],
  rules: ComplementaryRule[],
  { storeId, sameStoreOnly = false, limit = 8, maxPerCategory = 2 }: RankRelatedOptions = {},
): RankedRelated[] {
  const relevanceByCategory = categoryRelevance(ctx, rules);
  const candidates: RankedRelated[] = [];

  for (const item of items) {
    const relevance = relevanceByCategory.get(item.category) ?? 0;
    if (relevance <= 0) continue;
    if (!item.species.includes(ctx.species)) continue;
    if (item.lifeStages.length && !intersects(item.lifeStages, ctx.lifeStages)) continue;

    const available = item.offers.filter((o) => o.inStock && o.price > 0);
    const sameStoreOffer = storeId ? available.find((o) => o.storeId === storeId) : undefined;
    if (sameStoreOnly && !sameStoreOffer) continue;
    const offer = sameStoreOffer ?? [...available].sort((a, b) => a.price - b.price)[0];
    if (!offer) continue;

    const expectedCommission = offer.price * (offer.commissionRate ?? 0);
    const sameStore = !!sameStoreOffer;
    const score = relevance * expectedCommission * (sameStore ? SAME_STORE_BONUS : 1);
    candidates.push({ item, offer, relevance, sameStore, expectedCommission, score });
  }

  candidates.sort((a, b) => b.score - a.score || b.relevance - a.relevance || a.offer.price - b.offer.price);

  const perCategory = new Map<ComplementCategorySlug, number>();
  const result: RankedRelated[] = [];
  for (const c of candidates) {
    const count = perCategory.get(c.item.category) ?? 0;
    if (count >= maxPerCategory) continue;
    perCategory.set(c.item.category, count + 1);
    result.push(c);
    if (result.length >= limit) break;
  }
  return result;
}
