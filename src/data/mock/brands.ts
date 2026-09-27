import type { Brand, ProductLine, SpeciesSlug } from "@/types/catalog";

type BrandSeed = [slug: string, name: string, color: string, species: SpeciesSlug[], lines: [string, string][], description: string];

const both: SpeciesSlug[] = ["caes", "gatos"];

/**
 * Seed de marcas (seção 4.3). Cores são apenas para o placeholder com iniciais —
 * logos oficiais serão enviados pelo admin.
 */
const seeds: BrandSeed[] = [
  ["royal-canin", "Royal Canin", "#c8102e", both, [["size-health-nutrition", "Size Health Nutrition"], ["feline-health-nutrition", "Feline Health Nutrition"], ["veterinary-diet", "Veterinary Diet"]], "Nutrição específica por porte, raça e fase de vida."],
  ["hills", "Hill's", "#1d4ed8", both, [["science-diet", "Science Diet"], ["prescription-diet", "Prescription Diet"]], "Linhas de nutrição clínica e de manutenção."],
  ["pro-plan", "Purina Pro Plan", "#4b5563", both, [["pro-plan", "Pro Plan"]], "Linha super premium da Purina."],
  ["farmina-nd", "Farmina N&D", "#15803d", both, [["nd-prime", "N&D Prime"], ["nd-ancestral-grain", "N&D Ancestral Grain"]], "Receitas com alto teor de proteína animal."],
  ["premier", "PremieR", "#7c2d12", both, [["formula", "Fórmula"], ["gatos-castrados", "Gatos Castrados"]], "Linhas premium especiais por porte e fase."],
  ["golden", "Golden", "#ca8a04", both, [["formula", "Golden Fórmula"], ["gatos", "Golden Gatos"], ["gourmet", "Golden Gourmet"]], "Premium especial com boa relação custo-benefício."],
  ["guabi-natural", "Guabi Natural", "#166534", both, [["guabi-natural", "Guabi Natural"]], "Super premium sem corantes e aromatizantes artificiais."],
  ["biofresh", "Biofresh", "#0f766e", both, [["biofresh", "Biofresh"]], "Super premium com ingredientes frescos."],
  ["formula-natural", "Formula Natural", "#65a30d", both, [["fresh-meat", "Fresh Meat"]], "Receitas com carne fresca e sem corantes."],
  ["quatree", "Quatree", "#9333ea", both, [["supreme", "Supreme"]], "Linha premium especial."],
  ["three-dogs", "Three Dogs", "#0369a1", ["caes"], [["original", "Original"]], "Premium especial para cães."],
  ["three-cats", "Three Cats", "#0e7490", ["gatos"], [["original", "Original"]], "Premium especial para gatos."],
  ["equilibrio", "Equilíbrio", "#be123c", both, [["equilibrio", "Equilíbrio"]], "Premium especial da Total Alimentos."],
  ["origens", "Origens", "#a16207", ["caes"], [["origens", "Origens"]], "Premium especial com proteínas selecionadas."],
  ["granplus", "GranPlus", "#b45309", both, [["menu", "Menu"], ["choice", "Choice"]], "Premium especial acessível."],
  ["special-dog", "Special Dog", "#dc2626", ["caes"], [["premium", "Premium"]], "Opção econômica para o dia a dia."],
  ["special-cat", "Special Cat", "#db2777", ["gatos"], [["premium", "Premium"]], "Opção econômica para gatos."],
  ["magnus", "Magnus", "#1e40af", ["caes"], [["todo-dia", "Todo Dia"]], "Ração econômica para cães."],
  ["max", "Max", "#b91c1c", both, [["max", "Max"]], "Linha standard da Total Alimentos."],
  ["pedigree", "Pedigree", "#eab308", ["caes"], [["racas", "Pedigree"], ["sache", "Sachê"], ["dentastix", "Dentastix"], ["marrobone", "Marrobone"]], "Rações, sachês e petiscos para cães."],
  ["whiskas", "Whiskas", "#7e22ce", ["gatos"], [["seca", "Whiskas"], ["sache", "Sachê"]], "Rações e sachês para gatos."],
  ["dog-chow", "Dog Chow", "#e11d48", ["caes"], [["extra-life", "Extra Life"]], "Linha standard da Purina para cães."],
  ["cat-chow", "Cat Chow", "#c2410c", ["gatos"], [["cat-chow", "Cat Chow"]], "Linha standard da Purina para gatos."],
  ["friskies", "Friskies", "#dc2626", ["gatos"], [["seca", "Friskies"], ["sache", "Sachê"]], "Rações e sachês para gatos."],
  ["dreamies", "Dreamies", "#6d28d9", ["gatos"], [["dreamies", "Dreamies"]], "Petiscos crocantes para gatos."],
  ["keldog", "Keldog", "#92400e", ["caes"], [["bifinho", "Bifinho"]], "Petiscos tipo bifinho para cães."],
];

function initialsOf(name: string) {
  const words = name.replace(/['’]/g, "").replace(/[^\p{L}\s&]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export const brands: Brand[] = seeds.map(([slug, name, color, species, , description]) => ({
  id: `br-${slug}`,
  slug,
  name,
  color,
  initials: initialsOf(name),
  logoUrl: null,
  species,
  description,
}));

export const productLines: ProductLine[] = seeds.flatMap(([slug, , , , lines]) =>
  lines.map(([lineSlug, lineName]) => ({
    id: `ln-${slug}-${lineSlug}`,
    brandId: `br-${slug}`,
    slug: lineSlug,
    name: lineName,
  })),
);
