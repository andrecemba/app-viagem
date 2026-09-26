import type { Offer, OfferPriceHistory, Product, SegmentSlug, Store } from "@/types/catalog";

import { createRng, MOCK_NOW } from "./random";
import { products } from "./products";
import { stores } from "./stores";

/**
 * Gera 3 a 5 ofertas fictícias por produto, com e sem comissão / frete grátis,
 * e 60 dias de histórico (um ponto a cada 2 dias, como a verificação real).
 * Todos os preços e percentuais são FICTÍCIOS.
 */

const pricePerKg: Record<"dry" | "wet" | "snack", Record<SegmentSlug, number>> = {
  dry: { economica: 11, standard: 16.5, premium: 26, "super-premium": 52 },
  wet: { economica: 26, standard: 33, premium: 42, "super-premium": 64 },
  snack: { economica: 58, standard: 92, premium: 110, "super-premium": 140 },
};

/** Percentuais fictícios por loja (a tabela real `commission_rates` vem na Fase 1). */
function commissionFor(store: Store, rng: ReturnType<typeof createRng>): number | null {
  switch (store.slug) {
    case "amazon":
      return 0.11; // TODO(você): confirmar na tabela oficial do Amazon Associados.
    case "mercado-livre":
      return 0.07;
    case "shopee":
      return Number(rng.between(0.03, 0.1).toFixed(3)); // varia por item (+ comissão extra do vendedor)
    case "petz":
      return 0.05;
    case "cobasi":
      return 0.06;
    default:
      return null;
  }
}

function storeUrl(store: Store, product: Product, rng: ReturnType<typeof createRng>) {
  const s = product.slug;
  switch (store.slug) {
    case "amazon":
      return `https://www.amazon.com.br/${s}/dp/B0${rng.code(8)}?ref=sr_1_3&crid=${rng.code(10)}&keywords=racao`;
    case "mercado-livre":
      return `https://produto.mercadolivre.com.br/MLB-${rng.int(1000000000, 4999999999)}-${s}-_JM`;
    case "shopee":
      return `https://shopee.com.br/${s}-i.${rng.int(100000000, 999999999)}.${rng.int(10000000000, 29999999999)}`;
    case "petz":
      return `https://www.petz.com.br/produto/${s}-${rng.int(10000, 99999)}`;
    case "cobasi":
      return `https://www.cobasi.com.br/${s}-${rng.int(3000000, 3999999)}/p`;
    case "petlove":
      return `https://www.petlove.com.br/${s}/p`;
    case "magalu":
      return `https://www.magazineluiza.com.br/${s}/p/${rng.code(9).toLowerCase()}/`;
    default:
      return `https://mercado-exemplo.example/${s}`;
  }
}

function roundPrice(value: number) {
  return Math.max(1.9, Math.floor(value) + 0.9);
}

function chooseStores(product: Product, rng: ReturnType<typeof createRng>): Store[] {
  const eligible = stores.filter(
    (st) => st.type !== "supermarket" || product.segment === "economica" || product.segment === "standard",
  );
  const count = Math.min(eligible.length, rng.int(3, 5));
  // Amazon aparece na maioria dos produtos; demais lojas embaralhadas.
  const shuffled = [...eligible].sort(() => rng.next() - 0.5);
  const amazon = eligible.find((s) => s.slug === "amazon");
  const picked = amazon && rng.chance(0.8) ? [amazon, ...shuffled.filter((s) => s !== amazon)] : shuffled;
  return picked.slice(0, count);
}

export const offers: Offer[] = [];
export const priceHistory: OfferPriceHistory[] = [];

for (const product of products) {
  const rng = createRng(product.id);
  const kg = product.netWeightGrams / 1000;
  const packFactor = product.format === "dry" ? 1 + 0.28 * (1 - Math.min(kg, 15) / 15) : 1;
  const vetFactor = product.foodType === "dietas-veterinarias" ? 1.45 : 1;
  const basePrice = pricePerKg[product.format][product.segment] * kg * packFactor * vetFactor * rng.between(0.9, 1.1);

  chooseStores(product, rng).forEach((store, i) => {
    const price = roundPrice(basePrice * rng.between(0.88, 1.12));
    const offerId = `of-${product.id.slice(3)}-${store.slug}`;
    const commissionRate = commissionFor(store, rng);
    const isPetStore = store.type === "pet_store";
    const hasPix = (store.slug === "petz" || store.slug === "cobasi" || store.slug === "magalu") && rng.chance(0.6);
    const hasSubscription =
      (isPetStore || store.slug === "amazon") && product.format !== "snack" && rng.chance(0.55);

    const affiliateApiUrl = store.slug === "shopee" ? `https://s.shopee.com.br/EXEMPLO${rng.code(5)}` : null;
    const affiliateManualUrl =
      store.slug === "mercado-livre" && rng.chance(0.6)
        ? `https://mercadolivre.com/sec/EXEMPLO${rng.code(5)}`
        : store.slug === "petz" && rng.chance(0.4)
          ? `https://www.petz.com.br/parceiro/EXEMPLO?produto=${product.slug}`
          : null;

    const offer: Offer = {
      id: offerId,
      productId: product.id,
      storeId: store.id,
      url: storeUrl(store, product, rng),
      sellerName: store.type === "marketplace" && rng.chance(0.5) ? `Loja parceira ${rng.int(10, 99)}` : store.name,
      price,
      pixPrice: hasPix ? roundPrice(price * 0.95) : null,
      subscriptionPrice: hasSubscription ? roundPrice(price * 0.9) : null,
      freeShipping: price > 150 ? rng.chance(0.7) : rng.chance(0.3),
      inStock: i === 0 ? true : rng.chance(0.93),
      status: "active",
      lastCheckedAt: new Date(MOCK_NOW.getTime() - rng.int(1, 40) * 3600_000).toISOString(),
      commissionRate,
      affiliateApiUrl,
      affiliateManualUrl,
    };
    offers.push(offer);

    // Histórico: caminhada aleatória "para trás" a partir do preço atual.
    const points = [];
    let p = price;
    const recentDrop = rng.chance(0.3) ? rng.between(0.05, 0.16) : 0;
    for (let day = 0; day <= 60; day += 2) {
      const date = new Date(MOCK_NOW.getTime() - day * 86400_000).toISOString().slice(0, 10);
      points.unshift({ date, price: Number(p.toFixed(2)) });
      if (day === 0 && recentDrop) p = roundPrice(price / (1 - recentDrop));
      else p = roundPrice(p * rng.between(0.965, 1.04));
    }
    priceHistory.push({ offerId, points });
  });

  // Alguns produtos recebem uma oferta suspeita (outlier) que fica na fila de revisão, fora do site.
  if (rng.chance(0.12)) {
    const store = stores[2];
    offers.push({
      id: `of-${product.id.slice(3)}-revisao`,
      productId: product.id,
      storeId: store.id,
      url: storeUrl(store, product, rng),
      sellerName: "Vendedor novo",
      price: roundPrice(basePrice * 0.45),
      pixPrice: null,
      subscriptionPrice: null,
      freeShipping: false,
      inStock: true,
      status: "pending_review",
      lastCheckedAt: MOCK_NOW.toISOString(),
      commissionRate: 0.05,
      affiliateApiUrl: null,
      affiliateManualUrl: null,
    });
  }
}
