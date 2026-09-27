import type {
  FeedingRow,
  FoodFormat,
  FoodTypeSlug,
  LifeStageSlug,
  Product,
  RefinementSlug,
  SegmentSlug,
  SizeSlug,
  SpeciesSlug,
} from "@/types/catalog";

interface ProductSeed {
  brand: string;
  line: string;
  name: string;
  species: SpeciesSlug;
  type: FoodTypeSlug;
  format?: FoodFormat;
  stages: LifeStageSlug[];
  sizes?: SizeSlug[];
  segment: SegmentSlug;
  flavor: string;
  refinements?: RefinementSlug[];
  grams: number;
  units?: number;
  /** Agrupa embalagens do mesmo produto; padrão = slug do nome + sabor (sem o peso). */
  group?: string;
  /** Sem tabela de consumo cadastrada (a calculadora pede a quantidade manualmente). */
  noFeedingTable?: boolean;
}

const seeds: ProductSeed[] = [
  // ── Cães · ração seca ─────────────────────────────────────────────
  { brand: "royal-canin", line: "size-health-nutrition", name: "Royal Canin Mini Adult", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["mini", "pequeno"], segment: "super-premium", flavor: "Frango", grams: 2500, group: "royal-canin-mini-adult" },
  { brand: "royal-canin", line: "size-health-nutrition", name: "Royal Canin Mini Adult", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["mini", "pequeno"], segment: "super-premium", flavor: "Frango", grams: 7500, group: "royal-canin-mini-adult" },
  { brand: "royal-canin", line: "size-health-nutrition", name: "Royal Canin Medium Adult", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio"], segment: "super-premium", flavor: "Frango", grams: 15000 },
  { brand: "royal-canin", line: "size-health-nutrition", name: "Royal Canin Maxi Puppy", species: "caes", type: "racao-seca", stages: ["filhote"], sizes: ["grande"], segment: "super-premium", flavor: "Frango", grams: 15000 },
  { brand: "hills", line: "science-diet", name: "Hill's Science Diet Adulto Raças Pequenas", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["mini", "pequeno"], segment: "super-premium", flavor: "Frango", grams: 2400, noFeedingTable: true },
  { brand: "pro-plan", line: "pro-plan", name: "Pro Plan Cães Adultos Médio", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio"], segment: "super-premium", flavor: "Frango e arroz", grams: 15000 },
  { brand: "farmina-nd", line: "nd-prime", name: "N&D Prime Adult Medium", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio"], segment: "super-premium", flavor: "Frango e romã", refinements: ["grain-free", "sem-corante"], grams: 10100 },
  { brand: "premier", line: "formula", name: "PremieR Fórmula Adultos Raças Médias", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio"], segment: "premium", flavor: "Frango", grams: 15000 },
  { brand: "premier", line: "formula", name: "PremieR Fórmula Filhotes Raças Pequenas", species: "caes", type: "racao-seca", stages: ["filhote"], sizes: ["mini", "pequeno"], segment: "premium", flavor: "Frango", grams: 2500 },
  { brand: "golden", line: "formula", name: "Golden Fórmula Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "premium", flavor: "Frango e arroz", grams: 15000, group: "golden-formula-adultos" },
  { brand: "golden", line: "formula", name: "Golden Fórmula Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "premium", flavor: "Frango e arroz", grams: 3000, group: "golden-formula-adultos" },
  { brand: "golden", line: "formula", name: "Golden Fórmula Mini Bits Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["mini", "pequeno"], segment: "premium", flavor: "Carne e arroz", grams: 10100 },
  { brand: "golden", line: "formula", name: "Golden Fórmula Sênior", species: "caes", type: "racao-seca", stages: ["senior"], sizes: ["medio", "grande"], segment: "premium", flavor: "Frango e arroz", refinements: ["light"], grams: 15000 },
  { brand: "guabi-natural", line: "guabi-natural", name: "Guabi Natural Adulto Raças Médias", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio"], segment: "super-premium", flavor: "Frango e arroz integral", refinements: ["sem-corante"], grams: 12000 },
  { brand: "biofresh", line: "biofresh", name: "Biofresh Adulto Raças Médias", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio"], segment: "super-premium", flavor: "Mix de carnes", refinements: ["sem-corante"], grams: 10100 },
  { brand: "formula-natural", line: "fresh-meat", name: "Formula Natural Fresh Meat Adulto Mini e Pequeno", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["mini", "pequeno"], segment: "super-premium", flavor: "Frango", refinements: ["sem-corante", "pele-sensivel"], grams: 7000 },
  { brand: "quatree", line: "supreme", name: "Quatree Supreme Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "premium", flavor: "Frango e batata-doce", refinements: ["sem-corante"], grams: 15000 },
  { brand: "three-dogs", line: "original", name: "Three Dogs Original Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "premium", flavor: "Frango", grams: 15000, noFeedingTable: true },
  { brand: "equilibrio", line: "equilibrio", name: "Equilíbrio Adultos Raças Médias", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio"], segment: "premium", flavor: "Frango", grams: 15000 },
  { brand: "origens", line: "origens", name: "Origens Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "premium", flavor: "Frango e cereais", grams: 15000 },
  { brand: "granplus", line: "menu", name: "GranPlus Menu Adultos Médio e Grande", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "premium", flavor: "Carne e arroz", grams: 15000 },
  { brand: "special-dog", line: "premium", name: "Special Dog Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "economica", flavor: "Carne", grams: 20000 },
  { brand: "magnus", line: "todo-dia", name: "Magnus Todo Dia Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "economica", flavor: "Carne", grams: 15000, noFeedingTable: true },
  { brand: "max", line: "max", name: "Max Cães Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "standard", flavor: "Carne e frango", grams: 20000 },
  { brand: "pedigree", line: "racas", name: "Pedigree Adultos Raças Médias e Grandes", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "standard", flavor: "Carne, frango e cereais", grams: 20000 },
  { brand: "pedigree", line: "racas", name: "Pedigree Filhotes Raças Médias e Grandes", species: "caes", type: "racao-seca", stages: ["filhote"], sizes: ["medio", "grande"], segment: "standard", flavor: "Carne, frango e cereais", grams: 10100 },
  { brand: "dog-chow", line: "extra-life", name: "Dog Chow Extra Life Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "standard", flavor: "Frango e arroz", grams: 15000 },
  // ── Cães · úmida, petiscos e dietas ───────────────────────────────
  { brand: "pedigree", line: "sache", name: "Pedigree Sachê Adultos Carne ao Molho 100 g (caixa com 18)", species: "caes", type: "racao-umida", stages: ["adulto"], segment: "standard", flavor: "Carne", grams: 1800, units: 18 },
  { brand: "golden", line: "gourmet", name: "Golden Gourmet Cães Adultos Patê 100 g (caixa com 12)", species: "caes", type: "racao-umida", stages: ["adulto"], segment: "premium", flavor: "Frango", grams: 1200, units: 12 },
  { brand: "pedigree", line: "dentastix", name: "Pedigree Dentastix Raças Médias (7 unidades)", species: "caes", type: "petiscos", stages: ["adulto"], sizes: ["medio"], segment: "standard", flavor: "Original", grams: 180, units: 7 },
  { brand: "pedigree", line: "marrobone", name: "Pedigree Marrobone", species: "caes", type: "petiscos", stages: ["adulto"], segment: "standard", flavor: "Carne", grams: 500 },
  { brand: "keldog", line: "bifinho", name: "Keldog Bifinho Carne", species: "caes", type: "petiscos", stages: ["filhote", "adulto", "senior"], segment: "economica", flavor: "Carne", grams: 500 },
  { brand: "royal-canin", line: "veterinary-diet", name: "Royal Canin Veterinary Gastrointestinal Cães", species: "caes", type: "dietas-veterinarias", format: "dry", stages: ["adulto", "senior"], segment: "super-premium", flavor: "Frango", grams: 10100, noFeedingTable: true },
  { brand: "hills", line: "prescription-diet", name: "Hill's Prescription Diet i/d Cães", species: "caes", type: "dietas-veterinarias", format: "dry", stages: ["adulto"], segment: "super-premium", flavor: "Frango", grams: 3850, noFeedingTable: true },
  // ── Gatos · ração seca ────────────────────────────────────────────
  { brand: "royal-canin", line: "feline-health-nutrition", name: "Royal Canin Indoor Gatos Adultos", species: "gatos", type: "racao-seca", stages: ["adulto"], segment: "super-premium", flavor: "Frango", grams: 7500 },
  { brand: "royal-canin", line: "feline-health-nutrition", name: "Royal Canin Sterilised Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "super-premium", flavor: "Frango", grams: 4000 },
  { brand: "pro-plan", line: "pro-plan", name: "Pro Plan Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "super-premium", flavor: "Salmão", grams: 10100 },
  { brand: "farmina-nd", line: "nd-prime", name: "N&D Prime Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "super-premium", flavor: "Frango e romã", refinements: ["grain-free", "sem-corante"], grams: 1500 },
  { brand: "premier", line: "gatos-castrados", name: "PremieR Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "premium", flavor: "Salmão", grams: 7500 },
  { brand: "golden", line: "gatos", name: "Golden Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "premium", flavor: "Frango", grams: 10100 },
  { brand: "guabi-natural", line: "guabi-natural", name: "Guabi Natural Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "super-premium", flavor: "Salmão e cevada", refinements: ["sem-corante"], grams: 7500 },
  { brand: "three-cats", line: "original", name: "Three Cats Original Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "premium", flavor: "Salmão", grams: 10100 },
  { brand: "granplus", line: "choice", name: "GranPlus Choice Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "premium", flavor: "Frango e carne", grams: 10100, noFeedingTable: true },
  { brand: "biofresh", line: "biofresh", name: "Biofresh Gatos Filhotes", species: "gatos", type: "racao-seca", stages: ["filhote"], segment: "super-premium", flavor: "Frango", refinements: ["sem-corante"], grams: 1500 },
  { brand: "equilibrio", line: "equilibrio", name: "Equilíbrio Gatos Sênior", species: "gatos", type: "racao-seca", stages: ["senior"], segment: "premium", flavor: "Frango", refinements: ["light"], grams: 7500 },
  { brand: "whiskas", line: "seca", name: "Whiskas Gatos Adultos Carne", species: "gatos", type: "racao-seca", stages: ["adulto"], segment: "economica", flavor: "Carne", grams: 10100 },
  { brand: "cat-chow", line: "cat-chow", name: "Cat Chow Adultos", species: "gatos", type: "racao-seca", stages: ["adulto"], segment: "standard", flavor: "Peixe", grams: 10100 },
  { brand: "friskies", line: "seca", name: "Friskies Gatos Adultos Mix de Carnes", species: "gatos", type: "racao-seca", stages: ["adulto"], segment: "economica", flavor: "Mix de carnes", grams: 10100 },
  { brand: "special-cat", line: "premium", name: "Special Cat Adultos", species: "gatos", type: "racao-seca", stages: ["adulto"], segment: "economica", flavor: "Peixe", grams: 10100 },
  // ── Gatos · úmida, petiscos e dietas ──────────────────────────────
  { brand: "whiskas", line: "sache", name: "Whiskas Sachê Carne ao Molho 85 g (caixa com 20)", species: "gatos", type: "racao-umida", stages: ["adulto"], segment: "economica", flavor: "Carne", grams: 1700, units: 20 },
  { brand: "friskies", line: "sache", name: "Friskies Sachê Peixe ao Molho 85 g (caixa com 15)", species: "gatos", type: "racao-umida", stages: ["adulto"], segment: "economica", flavor: "Peixe", grams: 1275, units: 15 },
  { brand: "royal-canin", line: "feline-health-nutrition", name: "Royal Canin Sachê Sterilised 85 g (caixa com 12)", species: "gatos", type: "racao-umida", stages: ["castrado", "adulto"], segment: "super-premium", flavor: "Frango", grams: 1020, units: 12 },
  { brand: "dreamies", line: "dreamies", name: "Dreamies Petisco Queijo (3 × 40 g)", species: "gatos", type: "petiscos", stages: ["adulto"], segment: "standard", flavor: "Queijo", grams: 120, units: 3 },
  { brand: "royal-canin", line: "veterinary-diet", name: "Royal Canin Veterinary Urinary S/O Gatos", species: "gatos", type: "dietas-veterinarias", format: "dry", stages: ["adulto"], segment: "super-premium", flavor: "Frango", grams: 7500, noFeedingTable: true },
  // ── Embalagens adicionais (acrescentadas no fim para não mudar os ids acima) ──
  // Várias embalagens do mesmo produto e sabores diferentes da mesma linha, para
  // testar que cada peso vira um item próprio no comparador.
  { brand: "royal-canin", line: "size-health-nutrition", name: "Royal Canin Mini Adult", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["mini", "pequeno"], segment: "super-premium", flavor: "Frango", grams: 1000, group: "royal-canin-mini-adult" },
  { brand: "royal-canin", line: "size-health-nutrition", name: "Royal Canin Mini Puppy", species: "caes", type: "racao-seca", stages: ["filhote"], sizes: ["mini", "pequeno"], segment: "super-premium", flavor: "Frango", grams: 2500 },
  { brand: "golden", line: "formula", name: "Golden Fórmula Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "premium", flavor: "Frango e arroz", grams: 20000, group: "golden-formula-adultos" },
  { brand: "golden", line: "formula", name: "Golden Fórmula Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "premium", flavor: "Carne e arroz", grams: 15000 },
  { brand: "golden", line: "formula", name: "Golden Fórmula Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "premium", flavor: "Carne e arroz", grams: 3000 },
  { brand: "golden", line: "formula", name: "Golden Fórmula Mini Bits Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["mini", "pequeno"], segment: "premium", flavor: "Carne e arroz", grams: 1000 },
  { brand: "golden", line: "gatos", name: "Golden Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "premium", flavor: "Frango", grams: 3000 },
  { brand: "golden", line: "gatos", name: "Golden Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "premium", flavor: "Frango", grams: 1000 },
  { brand: "golden", line: "gatos", name: "Golden Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "premium", flavor: "Salmão", grams: 10100 },
  { brand: "premier", line: "gatos-castrados", name: "PremieR Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "premium", flavor: "Salmão", grams: 1500 },
  { brand: "royal-canin", line: "feline-health-nutrition", name: "Royal Canin Sterilised Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "super-premium", flavor: "Frango", grams: 1500 },
  { brand: "whiskas", line: "seca", name: "Whiskas Gatos Adultos Carne", species: "gatos", type: "racao-seca", stages: ["adulto"], segment: "economica", flavor: "Carne", grams: 2700 },
  { brand: "special-dog", line: "premium", name: "Special Dog Adultos", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["medio", "grande"], segment: "economica", flavor: "Carne", grams: 10100 },
  { brand: "formula-natural", line: "fresh-meat", name: "Formula Natural Fresh Meat Adulto Mini e Pequeno", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["mini", "pequeno"], segment: "super-premium", flavor: "Frango", refinements: ["sem-corante", "pele-sensivel"], grams: 2500 },
  { brand: "guabi-natural", line: "guabi-natural", name: "Guabi Natural Gatos Castrados", species: "gatos", type: "racao-seca", stages: ["castrado", "adulto"], segment: "super-premium", flavor: "Salmão e cevada", refinements: ["sem-corante"], grams: 1500 },
  { brand: "guabi-natural", line: "guabi-natural", name: "Guabi Natural Adulto Raças Grandes e Gigantes", species: "caes", type: "racao-seca", stages: ["adulto"], sizes: ["grande"], segment: "super-premium", flavor: "Frango e arroz integral", refinements: ["sem-corante"], grams: 15000 },
  { brand: "royal-canin", line: "veterinary-diet", name: "Royal Canin Veterinary Urinary S/O Gatos", species: "gatos", type: "dietas-veterinarias", format: "dry", stages: ["adulto"], segment: "super-premium", flavor: "Frango", grams: 1500, noFeedingTable: true },
  { brand: "hills", line: "prescription-diet", name: "Hill's Prescription Diet c/d Gatos", species: "gatos", type: "dietas-veterinarias", format: "dry", stages: ["adulto"], segment: "super-premium", flavor: "Frango", grams: 1800, noFeedingTable: true },
  { brand: "royal-canin", line: "veterinary-diet", name: "Royal Canin Veterinary Renal Cães", species: "caes", type: "dietas-veterinarias", format: "dry", stages: ["adulto", "senior"], segment: "super-premium", flavor: "Frango", grams: 2000, noFeedingTable: true },
];

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatGrams(grams: number) {
  return grams >= 1000 ? `${(grams / 1000).toLocaleString("pt-BR")} kg` : `${grams} g`;
}

function defaultFormat(type: FoodTypeSlug): FoodFormat {
  if (type === "racao-umida") return "wet";
  if (type === "petiscos") return "snack";
  return "dry";
}

const segmentFactor: Record<SegmentSlug, number> = {
  economica: 1.25,
  standard: 1.12,
  premium: 1.0,
  "super-premium": 0.9,
};

/** Tabela de consumo fictícia (aprox. g/dia = k × peso^0,75), só para a calculadora de exemplo. */
function buildFeedingTable(species: SpeciesSlug, segment: SegmentSlug, stages: LifeStageSlug[]): FeedingRow[] {
  const weights = species === "caes" ? [2, 5, 10, 15, 20, 30, 40] : [2, 3, 4, 5, 6, 7];
  const base = species === "caes" ? 30 : 26;
  const stageFactor = stages.includes("filhote") ? 1.35 : stages.includes("castrado") || stages.includes("senior") ? 0.9 : 1;
  return weights.map((w) => ({
    petWeightKg: w,
    gramsPerDay: Math.round((base * segmentFactor[segment] * stageFactor * Math.pow(w, 0.75)) / 5) * 5,
  }));
}

const usedSlugs = new Set<string>();

export const products: Product[] = seeds.map((s, index) => {
  const format = s.format ?? defaultFormat(s.type);
  const isWeightInName = s.units != null;
  const fullName = isWeightInName ? s.name : `${s.name} ${formatGrams(s.grams)}`;
  // Mesma linha e peso com sabores diferentes: o sabor entra no slug para mantê-lo único.
  let slug = slugify(fullName);
  if (usedSlugs.has(slug)) slug = slugify(`${fullName} ${s.flavor}`);
  usedSlugs.add(slug);
  return {
    id: `pr-${String(index + 1).padStart(3, "0")}`,
    slug,
    name: fullName,
    categoryId: s.type === "dietas-veterinarias" ? "cat-dietas-vet" : `cat-${s.type}`,
    brandId: `br-${s.brand}`,
    lineId: `ln-${s.brand}-${s.line}`,
    species: s.species,
    foodType: s.type,
    format,
    lifeStages: s.stages,
    sizes: s.sizes ?? [],
    segment: s.segment,
    flavor: s.flavor,
    refinements: s.refinements ?? [],
    netWeightGrams: s.grams,
    unitCount: s.units ?? null,
    ean: index % 4 === 0 ? null : `789${String(1000000000 + index * 7919).slice(0, 10)}`,
    variantGroup: s.group ?? slugify(`${s.name} ${s.flavor}`),
    feedingTable:
      format === "dry" && s.type !== "dietas-veterinarias" && !s.noFeedingTable
        ? buildFeedingTable(s.species, s.segment, s.stages)
        : null,
  };
});
