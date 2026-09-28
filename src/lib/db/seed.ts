import { DEMO_PRODUCTS } from "@/data/demo-products";
import { SEED_CHECKED_HOW, seedProducts } from "@/data/seed-products";
import { INITIAL_STORES } from "@/data/stores";
import { addEvent, createOffer } from "@/lib/domain/offers";
import { saveProduct, type ProductInput } from "@/lib/domain/products";
import { saveStore } from "@/lib/domain/stores";
import type { Product } from "@/lib/domain/types";

import type { Db } from "./util";

/** Lojas iniciais sempre; catálogo e dados de exemplo só na primeira abertura (SEED_DEMO=0 desliga os exemplos). */
export function ensureSeed(db: Db) {
  const hasStores = db.prepare("SELECT 1 FROM stores LIMIT 1").get();
  if (!hasStores) for (const s of INITIAL_STORES) saveStore(db, s, true);
  const hasProducts = db.prepare("SELECT 1 FROM products LIMIT 1").get();
  if (!hasProducts) {
    seedRealProducts(db);
    if (process.env.SEED_DEMO !== "0") seedDemo(db);
  }
}

/**
 * Rações reais do cadastro inicial (fontes em src/data/seed-products.ts).
 * Sem preço: preço só entra com oferta verificada ou marcada como exemplo.
 */
export function seedRealProducts(db: Db): Product[] {
  const out: Product[] = [];
  db.transaction(() => {
    for (const s of seedProducts) {
      if (s.weightGrams == null) continue; // peso divergente entre fontes: não entra até conferir a embalagem
      const neutered = s.lifeStage === "castrado";
      const input: ProductInput = {
        species: s.species,
        brand: s.brand,
        line: s.line,
        indication: s.formula,
        flavor: s.flavor,
        weightGrams: s.weightGrams,
        unitCount: null,
        neutered,
        lifeStage: neutered ? "adulto" : s.lifeStage === "castrado" ? null : s.lifeStage,
        size: s.species === "gatos" ? null : s.size,
        foodType: s.foodType,
        needs: neutered ? ["castrados"] : [],
        gtin: null,
        imageUrl: null,
        description: null,
        sources: s.sources.map((src) => ({ url: src.url, note: `${src.kind === "fabricante" ? "Fabricante" : "Loja"} · ${src.evidence}` })),
        notes: [s.note, s.pending?.length ? `Pendente por divergência entre fontes: ${s.pending.join(", ")}.` : null, SEED_CHECKED_HOW].filter(Boolean).join("\n"),
        active: true,
      };
      out.push(saveProduct(db, null, input));
    }
  })();
  return out;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 2 ** 32);
}

/** R$/kg aproximados só para a demonstração (não são preços atuais). */
const PER_KG: Record<string, number> = {
  "Royal Canin": 58,
  "Hill's": 62,
  Farmina: 72,
  Purina: 42,
  "Guabi Natural": 33,
  Biofresh: 31,
  PremieR: 22,
  Golden: 14,
  GranPlus: 15,
  Pedigree: 11,
  Whiskas: 17,
  Friskies: 16,
  "Special Dog": 7,
};

/**
 * Dados de EXEMPLO: produtos extras e ofertas com preços fictícios (is_demo = 1),
 * com histórico de 45 dias. Nunca saem do site (sem redirecionamento) e aparecem com selo.
 */
export function seedDemo(db: Db) {
  const rand = rng(20260928);
  db.transaction(() => {
    const demo = DEMO_PRODUCTS.map((p) =>
      saveProduct(db, null, { ...p, unitCount: null, gtin: null, imageUrl: null, description: null, sources: [], notes: "Produto de exemplo para demonstração.", active: true }, { isDemo: true }),
    );
    const real = db.prepare("SELECT id, brand, weight_grams AS weightGrams, food_type AS foodType, indication, line, flavor FROM products WHERE is_demo = 0").all() as (Pick<
      Product,
      "id" | "brand" | "weightGrams" | "foodType" | "indication" | "line" | "flavor"
    >)[];
    const all = [...real, ...demo];
    const storeIds = ["mercado-livre", "amazon", "petz", "cobasi", "petlove", "shopee"];
    const now = Date.now();
    all.forEach((p, idx) => {
      const kg = p.weightGrams / 1000;
      const perKg = (PER_KG[p.brand] ?? 25) * (p.foodType === "umida" ? 2.6 : p.foodType === "medicamentosa" ? 1.5 : 1) * (1 + 0.25 * (1 - Math.min(kg, 15) / 15));
      const base = Math.max(3.9, perKg * kg);
      const count = 2 + Math.floor(rand() * 4);
      const picked = [...storeIds].sort(() => rand() - 0.5).slice(0, count);
      picked.forEach((storeId, j) => {
        const end = Math.max(2.9, Math.round(base * (0.9 + rand() * 0.22)) - 0.1);
        const hoursAgo = idx % 7 === 3 && j === 0 ? 80 + Math.floor(rand() * 60) : Math.floor(rand() * 40); // alguns preços antigos
        const obtainedAt = new Date(now - hoursAgo * 3600_000).toISOString();
        const search = encodeURIComponent([p.brand, p.line, p.indication, p.flavor].filter(Boolean).join(" "));
        const url = {
          "mercado-livre": `https://lista.mercadolivre.com.br/${search}`,
          amazon: `https://www.amazon.com.br/s?k=${search}`,
          petz: `https://www.petz.com.br/busca?q=${search}`,
          cobasi: `https://www.cobasi.com.br/pesquisa?terms=${search}`,
          petlove: `https://www.petlove.com.br/busca?q=${search}`,
          shopee: `https://shopee.com.br/search?keyword=${search}`,
        }[storeId]!;
        const divergent = idx === 5 && j === 1; // um exemplo de anúncio com peso diferente
        const offer = createOffer(
          db,
          {
            productId: p.id,
            storeId,
            dataSource: "manual",
            externalId: null,
            url,
            affiliateUrl: null,
            price: Number(end.toFixed(2)),
            previousPrice: null,
            previousPriceAt: null,
            availability: idx % 11 === 4 && j === picked.length - 1 ? "indisponivel" : "disponivel",
            freeShipping: end > 150 ? rand() < 0.7 : rand() < 0.2,
            listingTitle: null,
            listingWeightGrams: divergent ? Math.round(p.weightGrams * 0.2) : p.weightGrams,
            listingFlavor: p.flavor,
            imageUrl: null,
            notes: "EXEMPLO: preço fictício para demonstração.",
            priceSource: "exemplo",
            isDemo: true,
            obtainedAt,
          },
          "exemplo",
        );
        // Histórico fictício de 45 dias (serve para a média de 30 dias e o "preço anterior").
        let price = end;
        const drop = rand() < 0.3;
        for (let d = 3; d <= 45; d += 3) {
          price = drop && d === 3 ? end * (1.08 + rand() * 0.08) : price * (0.97 + rand() * 0.07);
          addEvent(db, {
            offerId: offer.id,
            at: new Date(now - hoursAgo * 3600_000 - d * 86400_000).toISOString(),
            kind: "sincronizacao",
            actor: "exemplo",
            price: Number(price.toFixed(2)),
            availability: "disponivel",
            message: "Histórico de exemplo.",
          });
          if (d === 3 && drop) {
            db.prepare("UPDATE offers SET previous_price = ?, previous_price_at = ? WHERE id = ?").run(
              Number(price.toFixed(2)),
              new Date(now - hoursAgo * 3600_000 - 3 * 86400_000).toISOString(),
              offer.id,
            );
          }
        }
      });
    });
  })();
}

/** Remove tudo o que é exemplo: produtos de exemplo e ofertas fictícias (os produtos reais ficam). */
export function removeDemo(db: Db) {
  db.transaction(() => {
    db.prepare("DELETE FROM offers WHERE is_demo = 1").run();
    db.prepare("DELETE FROM products WHERE is_demo = 1").run();
    db.prepare("DELETE FROM analytics_events WHERE is_demo = 1").run();
  })();
}
