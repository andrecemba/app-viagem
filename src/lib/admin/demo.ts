import { fieldFrom, emptyField } from "./fields";
import { newHistoryId } from "./checks";
import type { AdminDb, AdminOffer, CheckRun, HistoryEvent } from "./types";

/**
 * MODO DE DEMONSTRAÇÃO. Cria ofertas, preços e execuções FICTÍCIOS para testar
 * telas e alertas. Tudo fica marcado com `demo: true`, aparece com o selo
 * "Demonstração" e nunca é enviado ao site público. "Remover dados de
 * demonstração" apaga exatamente o que foi criado aqui.
 */

const DEMO_PRICE_PER_KG: Record<string, number> = {
  "Royal Canin": 78,
  Golden: 24,
  PremieR: 52,
  Purina: 62,
  Pedigree: 14,
  "Guabi Natural": 48,
  "Hill's": 88,
  Whiskas: 22,
  Farmina: 110,
};

/** Cenários que o conector de demonstração reproduz, para exercitar cada alerta. */
const SCENARIOS = ["OK", "OK", "FALHA", "PRECO", "REMOVIDO", "VENDEDOR", "VARIACAO", "LINK", "OK", "OK"];

function rand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function loadDemoData(db: AdminDb, now = new Date()): AdminDb {
  const cleaned = removeDemoData(db);
  const at = now.toISOString();
  const offers: AdminOffer[] = [];
  const history: HistoryEvent[] = [];
  const stores = cleaned.stores;

  cleaned.products.forEach((product, pi) => {
    const weight = product.fields.weightGrams.value;
    const brand = product.fields.brand.value ?? "";
    if (!weight) return; // Sem peso confirmado não há como simular preço honesto.
    const perKg = DEMO_PRICE_PER_KG[brand] ?? 40;
    const base = product.fields.foodType.value === "umida" ? 4.5 : (perKg * weight) / 1000;
    const count = 2 + Math.floor(rand(product.id) * 3);

    for (let si = 0; si < count; si++) {
      const store = stores[(pi + si) % stores.length];
      const scenario = si === 0 ? SCENARIOS[pi % SCENARIOS.length] : "OK";
      const id = `ofr-demo-${product.id.slice(4)}-${store.id}`;
      const price = Math.round(base * (0.92 + rand(id) * 0.16)) + 0.9;
      const stale = scenario === "OK" && si === 1 && pi % 4 === 0;
      const lastSuccessAt = new Date(now.getTime() - (stale ? 120 : 6 + rand(id + "t") * 30) * 3600_000).toISOString();
      const title = [brand, product.fields.formula.value, product.fields.flavor.value, formatWeightTitle(scenario === "VARIACAO" ? 3000 : weight)]
        .filter(Boolean)
        .join(" ");
      const affiliate = si === 1 && pi % 5 === 1 ? "" : si === 2 && pi % 6 === 2 ? "loja.exemplo/afiliado?id=123" : `https://exemplo.invalid/demo/${id}`;

      const offer: AdminOffer = {
        id,
        productId: product.id,
        storeId: store.id,
        externalId: `DEMO-${scenario}-${Math.floor(rand(id + "x") * 1e6)}`,
        fields: {
          price: fieldFrom(price, "demonstração", lastSuccessAt, "fonte_localizada"),
          availability: fieldFrom("disponivel", "demonstração", lastSuccessAt, "fonte_localizada"),
          url: fieldFrom(`https://www.${store.domains[0]}/demo-${product.id.slice(4)}`, "demonstração", at, "fonte_localizada"),
          affiliateUrl: affiliate ? fieldFrom(affiliate, "demonstração", at, "fonte_localizada") : emptyField(),
          sellerName: fieldFrom(store.name, "demonstração", at, "fonte_localizada"),
          listingTitle: fieldFrom(title, "demonstração", at, "fonte_localizada"),
          variationLabel: fieldFrom(formatWeightTitle(weight), "demonstração", at, "fonte_localizada"),
        },
        hidden: null,
        dataOrigin: "demonstração",
        commissionEligibility: store.affiliateProgram ? (si === 0 ? "confirmada" : "nao_confirmada") : "sem_programa",
        demo: true,
        lastCheckedAt: lastSuccessAt,
        lastSuccessAt,
        consecutiveFailures: 0,
        lastError: null,
        linkStatus: "nao_verificado",
        imageStatus: "nao_verificada",
        sellerChangedAt: null,
        variationChangedAt: null,
        createdAt: at,
        updatedAt: at,
      };
      offers.push(offer);

      // 6 pontos de histórico de preço, a cada 2 dias.
      for (let d = 6; d >= 1; d--) {
        const past = new Date(now.getTime() - d * 48 * 3600_000).toISOString();
        const p = Math.round(price * (0.95 + rand(`${id}:${d}`) * 0.1)) + 0.9;
        history.push({ id: newHistoryId(), at: past, entity: "offer", entityId: id, productId: product.id, offerId: id,
          type: "preco", field: "price", from: null, to: p, result: "ok", actor: "demonstração", demo: true,
          message: "Preço fictício (demonstração)." });
      }
      history.push({ id: newHistoryId(), at, entity: "offer", entityId: id, productId: product.id, offerId: id,
        type: "criacao", result: "ok", actor: "demonstração", demo: true, message: "Oferta fictícia criada pelo modo de demonstração." });
    }
  });

  // Execuções passadas fictícias.
  const runs: CheckRun[] = [1, 3].map((d, i) => ({
    id: `run-demo-${i}`,
    trigger: "agendada",
    startedAt: new Date(now.getTime() - d * 48 * 3600_000).toISOString(),
    finishedAt: new Date(now.getTime() - d * 48 * 3600_000 + 95_000).toISOString(),
    demo: true,
    stores: stores.map((s, si) => ({
      storeId: s.id,
      consulted: 6 + si,
      updated: 2 + (si % 3),
      errors: si === 1 && i === 0 ? 2 : 0,
      skipped: 0,
      message: si === 1 && i === 0 ? "Tempo de resposta esgotado (simulado)." : "Sem falhas.",
    })),
  }));

  return {
    ...cleaned,
    settings: { ...cleaned.settings, demoMode: true },
    offers: [...cleaned.offers, ...offers],
    history: [...cleaned.history, ...history],
    runs: [...runs, ...cleaned.runs],
  };
}

export function removeDemoData(db: AdminDb): AdminDb {
  return {
    ...db,
    settings: { ...db.settings, demoMode: false },
    offers: db.offers.filter((o) => !o.demo),
    history: db.history.filter((h) => !h.demo),
    alerts: db.alerts.filter((a) => !a.demo),
    runs: db.runs.filter((r) => !r.demo),
  };
}

function formatWeightTitle(grams: number) {
  return grams >= 1000 ? `${String(grams / 1000).replace(".", ",")}kg` : `${grams}g`;
}
