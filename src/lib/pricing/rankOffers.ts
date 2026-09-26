export interface Rankable {
  unitPrice: number;
  hasCommission: boolean;
}

/**
 * Ordenação honesta: menor preço unitário primeiro, SEMPRE.
 * A comissão só desempata ofertas cujo preço fica a até `tolerance` (1%)
 * da oferta mais barata do mesmo grupo — nunca coloca uma oferta
 * mais de 1% mais cara acima de outra.
 */
export function rankOffersHonestly<T extends Rankable>(items: T[], tolerance = 0.01): T[] {
  const byPrice = [...items].sort((a, b) => a.unitPrice - b.unitPrice);
  const result: T[] = [];
  let i = 0;
  while (i < byPrice.length) {
    const anchor = byPrice[i].unitPrice;
    const group: T[] = [];
    while (i < byPrice.length && byPrice[i].unitPrice <= anchor * (1 + tolerance)) {
      group.push(byPrice[i]);
      i++;
    }
    group.sort((a, b) => Number(b.hasCommission) - Number(a.hasCommission) || a.unitPrice - b.unitPrice);
    result.push(...group);
  }
  return result;
}
