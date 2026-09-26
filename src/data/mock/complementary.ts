import type {
  ComplementaryProduct,
  ComplementaryRule,
  ComplementCategorySlug,
  LifeStageSlug,
  SpeciesSlug,
} from "@/types/catalog";

import { createRng } from "./random";
import { stores } from "./stores";
import { slugify } from "./products";

export const complementCategoryLabels: Record<ComplementCategorySlug, string> = {
  "petiscos-ossos": "Petiscos e ossos",
  "mordedores-brinquedos": "Mordedores e brinquedos",
  "tapete-higienico": "Tapete higiênico",
  "saquinho-fezes": "Saquinho para fezes",
  "coleira-guia": "Coleira e guia",
  shampoo: "Shampoo pet",
  "higiene-bucal": "Higiene bucal",
  "comedouro-bebedouro": "Comedouro e bebedouro",
  caminha: "Caminha",
  "areia-sanitaria": "Areia sanitária",
  "caixa-areia": "Caixa de areia",
  arranhador: "Arranhador",
  saches: "Sachês",
  "fonte-agua": "Fonte de água",
  "escova-pelos": "Escova removedora de pelos",
  "rampa-escada": "Rampa / escada pet",
};

type Seed = [name: string, category: ComplementCategorySlug, species: SpeciesSlug[], basePrice: number, stages?: LifeStageSlug[]];

const seeds: Seed[] = [
  ["Osso Nó Natural para Cães (2 unidades)", "petiscos-ossos", ["caes"], 24.9],
  ["Bifinho Sabor Frango 250 g", "petiscos-ossos", ["caes"], 18.9],
  ["Mordedor de Borracha Resistente", "mordedores-brinquedos", ["caes"], 39.9],
  ["Mordedor para Filhotes com Textura", "mordedores-brinquedos", ["caes"], 29.9, ["filhote"]],
  ["Bolinha com Dispenser de Petisco", "mordedores-brinquedos", ["caes"], 34.9],
  ["Tapete Higiênico 60 × 60 cm (30 unidades)", "tapete-higienico", ["caes"], 69.9],
  ["Tapete Higiênico 80 × 60 cm (50 unidades)", "tapete-higienico", ["caes"], 119.9],
  ["Saquinho para Fezes Biodegradável (8 rolos)", "saquinho-fezes", ["caes"], 27.9],
  ["Coleira Peitoral com Guia Ajustável", "coleira-guia", ["caes"], 59.9],
  ["Shampoo Neutro Pet 500 ml", "shampoo", ["caes", "gatos"], 32.9],
  ["Kit Escova e Creme Dental Pet", "higiene-bucal", ["caes", "gatos"], 36.9],
  ["Comedouro Inox Antiderrapante", "comedouro-bebedouro", ["caes", "gatos"], 44.9],
  ["Caminha Redonda Acolchoada M", "caminha", ["caes", "gatos"], 129.9],
  ["Areia Sanitária Granulada 4 kg", "areia-sanitaria", ["gatos"], 26.9],
  ["Areia de Sílica 1,8 kg", "areia-sanitaria", ["gatos"], 39.9],
  ["Areia Biodegradável de Milho 3 kg", "areia-sanitaria", ["gatos"], 54.9],
  ["Caixa de Areia com Borda Alta", "caixa-areia", ["gatos"], 64.9],
  ["Arranhador Torre com Plataforma", "arranhador", ["gatos"], 149.9],
  ["Arranhador de Papelão com Catnip", "arranhador", ["gatos"], 49.9],
  ["Sachê Sabor Frango ao Molho 85 g (caixa com 10)", "saches", ["gatos"], 34.9],
  ["Sachê Sabor Salmão 85 g (caixa com 10)", "saches", ["gatos"], 37.9],
  ["Fonte de Água Elétrica 2 L", "fonte-agua", ["gatos"], 119.9],
  ["Varinha com Penas para Gatos", "mordedores-brinquedos", ["gatos"], 19.9],
  ["Escova Removedora de Pelos", "escova-pelos", ["caes", "gatos"], 42.9],
  ["Rampa Pet Dobrável", "rampa-escada", ["caes", "gatos"], 189.9, ["senior"]],
  ["Petisco Cremoso para Gatos (4 × 15 g)", "petiscos-ossos", ["gatos"], 14.9],
];

/** Percentuais FICTÍCIOS por loja para itens complementares (em geral maiores que os de ração). */
const complementCommission: Record<string, number | null> = {
  amazon: 0.1,
  "mercado-livre": 0.09,
  shopee: 0.08,
  petz: 0.07,
  cobasi: 0.08,
  petlove: null,
  magalu: null,
  "mercado-exemplo": null,
};

export const complementaryProducts: ComplementaryProduct[] = seeds.map(([name, category, species, basePrice, stages], i) => {
  const rng = createRng(`cp-${i}`);
  const eligible = stores.filter((s) => s.type !== "supermarket" || category === "areia-sanitaria");
  const picked = [...eligible].sort(() => rng.next() - 0.5).slice(0, rng.int(3, 5));
  const slug = slugify(name);
  return {
    id: `cp-${String(i + 1).padStart(3, "0")}`,
    slug,
    name,
    category,
    species,
    lifeStages: stages ?? [],
    offers: picked.map((store) => {
      const rate = complementCommission[store.slug];
      return {
        id: `co-${String(i + 1).padStart(3, "0")}-${store.slug}`,
        storeId: store.id,
        url: `https://${store.slug}.example/${slug}`,
        price: Math.floor(basePrice * rng.between(0.85, 1.15)) + 0.9,
        inStock: rng.chance(0.92),
        commissionRate: store.slug === "shopee" && rate ? Number(rng.between(0.05, 0.14).toFixed(3)) : rate,
      };
    }),
  };
});

/** Regras "compre junto" (tabela `complementary_rules`). Relevância de 0 a 1. */
export const complementaryRules: ComplementaryRule[] = [
  {
    id: "rule-caes-geral",
    species: "caes",
    foodTypes: ["racao-seca", "racao-umida", "dietas-veterinarias"],
    lifeStages: [],
    suggest: [
      { category: "petiscos-ossos", relevance: 1 },
      { category: "higiene-bucal", relevance: 0.8 },
      { category: "mordedores-brinquedos", relevance: 0.75 },
      { category: "saquinho-fezes", relevance: 0.7 },
      { category: "comedouro-bebedouro", relevance: 0.55 },
      { category: "shampoo", relevance: 0.5 },
      { category: "coleira-guia", relevance: 0.45 },
      { category: "caminha", relevance: 0.4 },
    ],
  },
  {
    id: "rule-caes-filhote",
    species: "caes",
    foodTypes: ["racao-seca", "racao-umida"],
    lifeStages: ["filhote"],
    suggest: [
      { category: "tapete-higienico", relevance: 1 },
      { category: "mordedores-brinquedos", relevance: 0.95 },
      { category: "caminha", relevance: 0.8 },
    ],
  },
  {
    id: "rule-caes-senior",
    species: "caes",
    foodTypes: ["racao-seca", "racao-umida"],
    lifeStages: ["senior"],
    suggest: [
      { category: "rampa-escada", relevance: 0.9 },
      { category: "caminha", relevance: 0.8 },
    ],
  },
  {
    id: "rule-caes-petisco",
    species: "caes",
    foodTypes: ["petiscos"],
    lifeStages: [],
    suggest: [
      { category: "mordedores-brinquedos", relevance: 0.9 },
      { category: "higiene-bucal", relevance: 0.7 },
      { category: "saquinho-fezes", relevance: 0.5 },
    ],
  },
  {
    id: "rule-gatos-seca",
    species: "gatos",
    foodTypes: ["racao-seca", "dietas-veterinarias"],
    lifeStages: [],
    suggest: [
      { category: "areia-sanitaria", relevance: 1 },
      { category: "saches", relevance: 0.95 },
      { category: "petiscos-ossos", relevance: 0.75 },
      { category: "fonte-agua", relevance: 0.7 },
      { category: "arranhador", relevance: 0.65 },
      { category: "caixa-areia", relevance: 0.5 },
      { category: "mordedores-brinquedos", relevance: 0.5 },
      { category: "escova-pelos", relevance: 0.45 },
    ],
  },
  {
    id: "rule-gatos-umida",
    species: "gatos",
    foodTypes: ["racao-umida", "petiscos"],
    lifeStages: [],
    suggest: [
      { category: "areia-sanitaria", relevance: 1 },
      { category: "petiscos-ossos", relevance: 0.7 },
      { category: "fonte-agua", relevance: 0.65 },
      { category: "mordedores-brinquedos", relevance: 0.55 },
      { category: "arranhador", relevance: 0.5 },
    ],
  },
  {
    id: "rule-gatos-senior",
    species: "gatos",
    foodTypes: ["racao-seca", "racao-umida"],
    lifeStages: ["senior"],
    suggest: [{ category: "rampa-escada", relevance: 0.85 }],
  },
];
