import type { ProductInput } from "@/lib/domain/products";

type DemoProduct = Pick<ProductInput, "species" | "brand" | "line" | "indication" | "flavor" | "weightGrams" | "neutered" | "lifeStage" | "size" | "foodType" | "needs">;

/**
 * Produtos de EXEMPLO (is_demo = 1) para a interface ter volume na demonstração.
 * Nomes no formato das linhas vendidas no Brasil, sem conferência de embalagem:
 * aparecem com o selo "Exemplo" e podem ser removidos no painel.
 */
export const DEMO_PRODUCTS: DemoProduct[] = [
  { species: "caes", brand: "PremieR", line: "PremieR Fórmula", indication: "Cães Adultos Raças Médias", flavor: "Frango", weightGrams: 15000, neutered: false, lifeStage: "adulto", size: "medio", foodType: "seca", needs: [] },
  { species: "caes", brand: "PremieR", line: "PremieR Fórmula", indication: "Cães Adultos Raças Médias", flavor: "Frango", weightGrams: 2500, neutered: false, lifeStage: "adulto", size: "medio", foodType: "seca", needs: [] },
  { species: "caes", brand: "Golden", line: "Golden Fórmula", indication: "Cães Adultos Mini Bits", flavor: "Carne e Arroz", weightGrams: 10100, neutered: false, lifeStage: "adulto", size: "mini_pequeno", foodType: "seca", needs: [] },
  { species: "caes", brand: "Golden", line: "Golden Fórmula", indication: "Cães Adultos Mini Bits", flavor: "Carne e Arroz", weightGrams: 3000, neutered: false, lifeStage: "adulto", size: "mini_pequeno", foodType: "seca", needs: [] },
  { species: "caes", brand: "Royal Canin", line: "Size Health Nutrition", indication: "Medium Adult", flavor: null, weightGrams: 15000, neutered: false, lifeStage: "adulto", size: "medio", foodType: "seca", needs: [] },
  { species: "caes", brand: "Royal Canin", line: "Size Health Nutrition", indication: "Maxi Puppy", flavor: null, weightGrams: 15000, neutered: false, lifeStage: "filhote", size: "grande", foodType: "seca", needs: [] },
  { species: "caes", brand: "Pedigree", line: "Pedigree", indication: "Cães Filhotes", flavor: "Carne, Frango e Cereais", weightGrams: 10100, neutered: false, lifeStage: "filhote", size: "todos", foodType: "seca", needs: [] },
  { species: "caes", brand: "Biofresh", line: "Biofresh", indication: "Cães Adultos Raças Pequenas e Mini", flavor: "Carne, Frutas e Vegetais", weightGrams: 10100, neutered: false, lifeStage: "adulto", size: "mini_pequeno", foodType: "natural", needs: ["sem_corantes"] },
  { species: "caes", brand: "Farmina", line: "N&D Prime", indication: "Cães Adultos Raças Médias", flavor: "Frango e Romã", weightGrams: 10100, neutered: false, lifeStage: "adulto", size: "medio", foodType: "natural", needs: ["sem_graos"] },
  { species: "caes", brand: "Special Dog", line: "Special Dog", indication: "Cães Adultos", flavor: "Carne", weightGrams: 20000, neutered: false, lifeStage: "adulto", size: "todos", foodType: "seca", needs: [] },
  { species: "caes", brand: "Pedigree", line: "Pedigree", indication: "Sachê Cães Adultos", flavor: "Carne ao Molho", weightGrams: 100, neutered: false, lifeStage: "adulto", size: "todos", foodType: "umida", needs: [] },
  { species: "gatos", brand: "Whiskas", line: "Whiskas", indication: "Gatos Adultos", flavor: "Peixe", weightGrams: 10100, neutered: false, lifeStage: "adulto", size: null, foodType: "seca", needs: [] },
  { species: "gatos", brand: "Whiskas", line: "Whiskas", indication: "Gatos Adultos", flavor: "Carne", weightGrams: 2700, neutered: false, lifeStage: "adulto", size: null, foodType: "seca", needs: [] },
  { species: "gatos", brand: "Golden", line: "Golden Gatos", indication: "Gatos Adultos Castrados", flavor: "Frango", weightGrams: 3000, neutered: true, lifeStage: "adulto", size: null, foodType: "seca", needs: [] },
  { species: "gatos", brand: "PremieR", line: "PremieR Fórmula", indication: "Gatos Filhotes", flavor: "Frango", weightGrams: 1500, neutered: false, lifeStage: "filhote", size: null, foodType: "seca", needs: [] },
  { species: "gatos", brand: "Royal Canin", line: "Feline Health Nutrition", indication: "Indoor 27", flavor: null, weightGrams: 1500, neutered: false, lifeStage: "adulto", size: null, foodType: "seca", needs: [] },
  { species: "gatos", brand: "GranPlus", line: "GranPlus Menu", indication: "Gatos Adultos Castrados", flavor: "Salmão e Arroz", weightGrams: 10100, neutered: true, lifeStage: "adulto", size: null, foodType: "seca", needs: [] },
  { species: "gatos", brand: "Friskies", line: "Friskies", indication: "Sachê Gatos Adultos", flavor: "Peixe ao Molho", weightGrams: 85, neutered: false, lifeStage: "adulto", size: null, foodType: "umida", needs: [] },
  { species: "gatos", brand: "Guabi Natural", line: "Guabi Natural", indication: "Gatos Adultos", flavor: "Frango e Arroz Integral", weightGrams: 1500, neutered: false, lifeStage: "adulto", size: null, foodType: "natural", needs: ["sem_corantes"] },
  { species: "gatos", brand: "Hill's", line: "Science Diet", indication: "Gatos Adultos", flavor: "Frango", weightGrams: 3000, neutered: false, lifeStage: "adulto", size: null, foodType: "seca", needs: [] },
];
