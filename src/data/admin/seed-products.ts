import type { DogSize, FoodType, LifeStage, Species } from "@/lib/admin/types";

/**
 * 20 rações reais para o catálogo inicial (10 para cães, 10 para gatos).
 *
 * COMO FORAM CONFERIDAS (27/09/2026): por busca na web. Os títulos e URLs abaixo
 * apareceram nos resultados e trazem nome, fórmula e peso. As páginas NÃO foram
 * abertas, porque a rede deste ambiente bloqueia os domínios de lojas e fabricantes.
 * Por isso nenhum campo está como "verificado": o melhor estado é
 * "fonte_localizada", e o que não apareceu na fonte fica vazio e "pendente".
 *
 * Nada foi deduzido de embalagens parecidas. Sabor ausente no nome oficial
 * (ex.: Royal Canin) fica vazio. GTIN, SKU, grão, descrição e foto ficam vazios
 * até alguém conferir a embalagem ou a página do fabricante.
 */

export interface SeedSource {
  url: string;
  kind: "fabricante" | "loja";
  evidence: string;
}

export interface SeedProduct {
  key: string;
  brand: string;
  line: string;
  formula: string;
  species: Species;
  lifeStage: LifeStage;
  size: DogSize | null;
  /** null = não consta no nome/fonte: fica "pendente de verificação". */
  flavor: string | null;
  weightGrams: number | null;
  foodType: FoodType;
  vetIndication: string | null;
  sources: SeedSource[];
  /** Campos cuja fonte diverge ou é incompleta (ficam "pendente"). */
  pending?: ("formula" | "flavor" | "weightGrams" | "size" | "lifeStage")[];
  note?: string;
}

export const SEED_CHECKED_AT = "2026-09-27T09:00:00-03:00";
export const SEED_CHECKED_HOW =
  "Título e URL em resultado de busca na web (27/09/2026). Página não aberta: domínio bloqueado pela rede do ambiente de desenvolvimento.";

export const seedProducts: SeedProduct[] = [
  // ── Cães ──────────────────────────────────────────────────────────────
  {
    key: "rc-mini-adult-7-5",
    brand: "Royal Canin",
    line: "Size Health Nutrition",
    formula: "Mini Adult",
    species: "caes",
    lifeStage: "adulto",
    size: "pequeno",
    flavor: null,
    weightGrams: 7500,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://www.polipet.com.br/Produto/racao-royal-canin-mini-adult-para-caes-adultos-de-porte-pequeno-7-5kg-95667",
        kind: "loja",
        evidence: "Título: “Ração Royal Canin Mini Adult Para Cães Adultos de Porte Pequeno 7,5kg”",
      },
      {
        url: "https://www.petz.com.br/produto/racao-royal-canin-mini-caes-adultos-71733",
        kind: "loja",
        evidence: "Página de produto Royal Canin Mini Adult (título do resultado; peso não aparece no título)",
      },
    ],
    note: "O nome oficial não informa sabor; campo deixado vazio. Faixa de peso do porte (até 10 kg) consta na descrição do resultado de busca.",
  },
  {
    key: "rc-mini-adult-2-5",
    brand: "Royal Canin",
    line: "Size Health Nutrition",
    formula: "Mini Adult",
    species: "caes",
    lifeStage: "adulto",
    size: "pequeno",
    flavor: null,
    weightGrams: 2500,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://www.polipet.com.br/Produto/racao-seca-royal-canin-mini-adult-para-caes-adultos-de-porte-pequeno-2-5kg-95666",
        kind: "loja",
        evidence: "Título: “Ração Seca Royal Canin Mini Adult Para Cães Adultos de Porte Pequeno 2,5kg”",
      },
      {
        url: "https://www.petyard.com.br/racao-seca-royal-canin-mini-adult-para-caes-adultos-de-porte-pequeno-25kgjhkn/p",
        kind: "loja",
        evidence: "Título: “Ração Seca Royal Canin Mini Adult para Cães Adultos de Porte Pequeno - 2,5 Kg”",
      },
    ],
    note: "Mesma fórmula do item de 7,5 kg, mas embalagem distinta: ficha própria.",
  },
  {
    key: "golden-formula-adultos-frango-15",
    brand: "Golden",
    line: "Golden Fórmula",
    formula: "Cães Adultos",
    species: "caes",
    lifeStage: "adulto",
    size: "todos",
    flavor: "Frango e Arroz",
    weightGrams: 15000,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://www.agrosolo.com.br/produto/racao-golden-formula-caes-adultos-frango-e-arroz-15-0-kg-85259",
        kind: "loja",
        evidence: "Título: “Ração Golden Fórmula Cães Adultos Frango e Arroz 15,0 kg”",
      },
      {
        url: "https://www.centrooestepet.com.br/alimentacao/racao-golden-formula-para-caes-adultos-frango-e-arroz-15kg",
        kind: "loja",
        evidence: "Título: “Ração Golden Formula para Cães Adultos Frango e Arroz 15kg”",
      },
    ],
    note: "Porte “todos” vem da descrição do resultado (“cães adultos de todas as raças”). Existe versão Raças Pequenas (Mini Bits): outro produto.",
  },
  {
    key: "golden-formula-adultos-carne-15",
    brand: "Golden",
    line: "Golden Fórmula",
    formula: "Cães Adultos",
    species: "caes",
    lifeStage: "adulto",
    size: "todos",
    flavor: "Carne e Arroz",
    weightGrams: 15000,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://www.polipet.com.br/produto/racao-golden-formula-cachorros-adultos-carne-e-arroz-15-0kg-94814",
        kind: "loja",
        evidence: "Título: “Ração Golden Formula Cães Adultos Sabor Carne e Arroz 15,0kg”",
      },
      {
        url: "https://www.petdoginbox.com.br/racao-golden-formula-para-caes-adultos-sabor-carne-e-arroz-15-kg-110821/p",
        kind: "loja",
        evidence: "Título: “Ração Golden Fórmula Para Cães Adultos Sabor Carne e Arroz 15 kg”",
      },
    ],
    note: "Mesmo peso e linha do item de frango, sabor diferente: ficha própria.",
  },
  {
    key: "premier-formula-filhotes-rp-frango-2-5",
    brand: "PremieR",
    line: "PremieR Fórmula",
    formula: "Cães Filhotes Raças Pequenas",
    species: "caes",
    lifeStage: "filhote",
    size: "pequeno",
    flavor: "Frango",
    weightGrams: 2500,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://premierpet.com.br/produto/premier-formula-racas-pequenas-caes-filhotes-sabor-frango/",
        kind: "fabricante",
        evidence: "Título: “PremieR Formula para Cães Filhotes Pequenos | Sabor Frango” (sem peso no título)",
      },
      {
        url: "https://www.agrosolo.com.br/produto/racao-premier-formula-caes-filhotes-racas-pequenas-frango-2-5-kg-85310",
        kind: "loja",
        evidence: "Título: “Ração Premier Fórmula Cães Filhotes Raças Pequenas Frango 2,5 kg”",
      },
    ],
  },
  {
    key: "proplan-adulto-medio-frango-15",
    brand: "Purina",
    line: "Pro Plan",
    formula: "Cães Adultos Raças Médias",
    species: "caes",
    lifeStage: "adulto",
    size: "medio",
    flavor: "Frango",
    weightGrams: 15000,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://purina.com.br/proplan/caes/adultos/racas-medias",
        kind: "fabricante",
        evidence: "Título: “Pro plan ração para cães de raças médias | Pro Plan Brasil” (sem peso no título)",
      },
      {
        url: "https://www.amazon.com.br/Nestl%C3%A9-Purina-ProPlan-Adultos-Frango/dp/B07Y2BYSGD",
        kind: "loja",
        evidence: "Título: “PURINA Pro Plan Ração Cães Adultos Médios Pro Plan Frango 15Kg”",
      },
    ],
  },
  {
    key: "pedigree-adultos-mg-carne-frango-cereais-20",
    brand: "Pedigree",
    line: "Pedigree",
    formula: "Cães Adultos Raças Médias e Grandes",
    species: "caes",
    lifeStage: "adulto",
    size: "medio_grande",
    flavor: "Carne, Frango e Cereais",
    weightGrams: 20000,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://www.pedigree.com.br/nossos-produtos/alimentos-secos/pedigree-racao-seca-adulto-sabor-carne-frango-e-cereais",
        kind: "fabricante",
        evidence: "Título: “Ração Seca Adulto Sabor Carne, Frango e Cereais | Pedigree®” (sem peso no título)",
      },
      {
        url: "https://www.casadoprodutor.com.br/7896029075722-rac-o-pedigree-c-es-adultos-carne-frango-e-cereais-20-kg.html",
        kind: "loja",
        evidence: "Título: “Ração Pedigree para Cães Adultos de Porte Médio e Grande Sabor Carne, Frango e Cereais 20kg”",
      },
    ],
    note: "O URL da Casa do Produtor começa com 7896029075722, possivelmente o GTIN. Não preenchido: conferir na embalagem.",
  },
  {
    key: "guabi-natural-adulto-medio-frango-12",
    brand: "Guabi Natural",
    line: "Guabi Natural",
    formula: "Cães Adultos Raças Médias",
    species: "caes",
    lifeStage: "adulto",
    size: "medio",
    flavor: "Frango e Arroz Integral",
    weightGrams: 12000,
    foodType: "natural",
    vetIndication: null,
    sources: [
      {
        url: "https://terrazoo.com.br/produto/racao-guabi-natural-para-caes-adultos-de-porte-medio-sabor-frango-e-arroz-integral-12kg/",
        kind: "loja",
        evidence: "Título: “Ração Guabi Natural para Cães Adultos de Porte Médio Sabor Frango e Arroz Integral 12Kg”",
      },
      {
        url: "https://www.petcaesecia.com.br/produto/racao-guabi-natural-para-caes-adultos-de-racas-medias-sabor-frango-e-arroz-integral-12kg-85448",
        kind: "loja",
        evidence: "Título: “Ração Guabi Natural Frango & Arroz 12kg | Cães Médios Adultos”",
      },
    ],
    note: "Há anúncios promocionais “leve 13 kg, pague 12 kg”: embalagem diferente, não vincular a esta ficha.",
  },
  {
    key: "rc-vet-gastrointestinal-caes-10-1",
    brand: "Royal Canin",
    line: "Veterinary Diet",
    formula: "Gastrointestinal Cães Adultos",
    species: "caes",
    lifeStage: "adulto",
    size: "todos",
    flavor: null,
    weightGrams: 10100,
    foodType: "medicamentosa",
    vetIndication: "Sensibilidades gastrointestinais — uso sob orientação do médico-veterinário",
    sources: [
      {
        url: "https://www.hiperzoo.com.br/racao-royal-canin-veterinary-diet-gastro-intestinal-para-caes-adultos-10-1kg",
        kind: "loja",
        evidence: "Título: “Ração Royal Canin Veterinary Diet Gastro Intestinal para Cães Adultos - 10.1Kg”",
      },
      {
        url: "https://www.americanpet.com.br/7896181213574-racao-seca-royal-canin-veterinary-diet-gastrointestinal-para-caes-adultos-com-sensibilidades-gastrointestinais-10-1-kg/p",
        kind: "loja",
        evidence: "Título: “Royal Canin p/ Cães com Sensibilidades gastrointestinais 10,1kg”",
      },
    ],
    note: "Não confundir com Gastrointestinal Low Fat nem Moderate Calorie, que são fórmulas diferentes. Amazon lista “10kg”: divergência a conferir.",
  },
  {
    key: "hills-sd-adulto-pequenos-mini-frango",
    brand: "Hill's",
    line: "Science Diet",
    formula: "Cães Adultos Raças Pequenas e Mini",
    species: "caes",
    lifeStage: "adulto",
    size: "mini_pequeno",
    flavor: "Frango",
    weightGrams: null,
    foodType: "seca",
    vetIndication: null,
    pending: ["weightGrams"],
    sources: [
      {
        url: "https://www.polipet.com.br/produto/racao-hill-s-science-diet-para-cachorros-adultos-pequenos-e-mini-2-4kg-96510",
        kind: "loja",
        evidence: "Título: “Ração Hill´s Science Diet para cachorros adultos pequenos e mini 2,4kg”",
      },
      {
        url: "https://www.amazon.com.br/Hills-Science-Diet-pequenos-adultos/dp/B003CL3PTM",
        kind: "loja",
        evidence: "Título: “Hill's Science Diet, Ração, Cães Adultos, Pequenos e Mini, Frango, 2,04 kg”",
      },
    ],
    note: "PESO DIVERGENTE entre fontes (2,4 kg × 2,04 kg). Campo deixado vazio até conferir a embalagem; a ficha não pode ser publicada sem peso.",
  },
  // ── Gatos ─────────────────────────────────────────────────────────────
  {
    key: "golden-gatos-castrados-frango-10-1",
    brand: "Golden",
    line: "Golden Gatos",
    formula: "Gatos Adultos Castrados",
    species: "gatos",
    lifeStage: "castrado",
    size: null,
    flavor: "Frango",
    weightGrams: 10100,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://www.polipet.com.br/produto/racao-golden-formula-gatos-adultos-castrados-frango-10-1-kg-94712",
        kind: "loja",
        evidence: "Título: “Ração GoldeN Formula Gatos Adultos Castrados Frango 10,1 kg”",
      },
      {
        url: "https://www.amazon.com.br/Ra%C3%A7%C3%A3o-Golden-Adultos-Castrados-Frango/dp/B07ZR2H7MM",
        kind: "loja",
        evidence: "Título: “Premier Pet Ração Golden Para Gatos Adultos Castrados - 10 1Kg - Sabor Frango”",
      },
    ],
    note: "Não confundir com Golden Special Gatos Castrados Frango e Carne (outra fórmula).",
  },
  {
    key: "golden-gatos-castrados-salmao-10-1",
    brand: "Golden",
    line: "Golden Gatos",
    formula: "Gatos Adultos Castrados",
    species: "gatos",
    lifeStage: "castrado",
    size: null,
    flavor: "Salmão",
    weightGrams: 10100,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://www.polipet.com.br/produto/racao-golden-para-gatos-castrados-salmao-10-1kg-94817",
        kind: "loja",
        evidence: "Título: “Ração GoldeN para gatos castrados salmão 10,1kg”",
      },
      {
        url: "https://www.amazon.com.br/Ra%C3%A7%C3%A3o-Golden-Adultos-Castrados-Salm%C3%A3o/dp/B07Y8LZR6V",
        kind: "loja",
        evidence: "Título: “Golden Ração para Gatos Adultos Castrados Sabor Salmão - 10,1kg Premier Pet Adulto”",
      },
    ],
  },
  {
    key: "rc-sterilised-37-1-5",
    brand: "Royal Canin",
    line: "Feline Health Nutrition",
    formula: "Sterilised 37 Gatos Adultos Castrados",
    species: "gatos",
    lifeStage: "castrado",
    size: null,
    flavor: null,
    weightGrams: 1500,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://www.royalcanin.com/br/cats/products/retail-products/sterilised-37-2537",
        kind: "fabricante",
        evidence: "Página oficial Sterilised 37 (resultado de busca; título “Royal Canin Brazil”, sem peso)",
      },
      {
        url: "https://www.petnautasloja.com.br/royal-canin-cat-sterilised-adultos-castrados-1-5kg/p/9036",
        kind: "loja",
        evidence: "Título: “Ração Royal Canin Sterilised para Gatos Adultos Castrados 1,5Kg”",
      },
    ],
    note: "Sabor não consta no nome oficial; campo vazio.",
  },
  {
    key: "rc-kitten-1-5",
    brand: "Royal Canin",
    line: "Feline Health Nutrition",
    formula: "Kitten Gatos Filhotes",
    species: "gatos",
    lifeStage: "filhote",
    size: null,
    flavor: null,
    weightGrams: 1500,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://www.polipet.com.br/produto/racao-royal-canin-feline-kitten-para-gatos-filhotes-1-5-kg-92705",
        kind: "loja",
        evidence: "Título: “Ração Royal Canin Feline Kitten para Gatos Filhotes 1,5 kg”",
      },
      {
        url: "https://www.petnautasloja.com.br/racao-royal-canin-kitten-para-gatos-filhotes-1-5kg/p/3763",
        kind: "loja",
        evidence: "Título: “Ração Royal Canin Kitten para Gatos Filhotes 1,5Kg”",
      },
    ],
    note: "Não confundir com Kitten Sterilised (filhotes castrados), outra fórmula.",
  },
  {
    key: "premier-gatos-castrados-salmao-7-5",
    brand: "PremieR",
    line: "PremieR Gatos",
    formula: "Gatos Adultos Castrados",
    species: "gatos",
    lifeStage: "castrado",
    size: null,
    flavor: "Salmão",
    weightGrams: 7500,
    foodType: "seca",
    vetIndication: null,
    pending: ["formula"],
    sources: [
      {
        url: "https://www.polipet.com.br/produto/racao-premier-formula-gatos-adultos-castrados-7-5kg-sabor-salmao-101060",
        kind: "loja",
        evidence: "Título: “Ração PremieR Formula Gatos Adultos Castrados 7,5kg Sabor Salmão”",
      },
      {
        url: "https://www.agrosolo.com.br/produto/racao-premier-ambientes-internos-gatos-adultos-castrados-de-6-meses-a-6-anos-salmao-7-5-kg-85380",
        kind: "loja",
        evidence: "Título: “Ração Premier Ambientes Internos Gatos Adultos Castrados de 6 Meses a 6 Anos Salmão 7,5 kg”",
      },
    ],
    note: "NOME DA FÓRMULA DIVERGENTE: lojas usam “Gatos Castrados” e “Ambientes Internos Gatos Castrados (até 6 ou até 7 anos)”. Conferir no site da PremieR se é a mesma fórmula.",
  },
  {
    key: "whiskas-adultos-carne-10-1",
    brand: "Whiskas",
    line: "Whiskas",
    formula: "Gatos Adultos",
    species: "gatos",
    lifeStage: "adulto",
    size: null,
    flavor: "Carne",
    weightGrams: 10100,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://www.polipet.com.br/Produto/racao-whiskas-para-gatos-adultos-sabor-carne-10-1kg-91815",
        kind: "loja",
        evidence: "Título: “Ração Whiskas Para Gatos Adultos Sabor Carne 10,1kg”",
      },
      {
        url: "https://www.amazon.com.br/Ra%C3%A7%C3%A3o-Whiskas-Carne-Gatos-Adultos/dp/B07XQ7J1DR",
        kind: "loja",
        evidence: "Título: “Ração Whiskas Carne Para Gatos Adultos 10,1 kg”",
      },
    ],
    note: "Existe Whiskas Gatos Castrados Carne 10,1 kg: outra fórmula.",
  },
  {
    key: "whiskas-sache-carne-molho-85",
    brand: "Whiskas",
    line: "Whiskas Sachê",
    formula: "Carne ao Molho Gatos Adultos",
    species: "gatos",
    lifeStage: "adulto",
    size: null,
    flavor: "Carne ao Molho",
    weightGrams: 85,
    foodType: "umida",
    vetIndication: null,
    sources: [
      {
        url: "https://www.whiskas.com.br/products/umida/racao-umida-whiskas-sache-carne-ao-molho-para-gatos-adultos-85-g",
        kind: "fabricante",
        evidence: "Título: “Ração Úmida WHISKAS® Sachê Carne ao Molho para Gatos Adultos 85 g”",
      },
      {
        url: "https://www.polipet.com.br/produto/sache-whiskas-para-gatos-adultos-85g-carne-ao-molho-89823",
        kind: "loja",
        evidence: "Título: “Sachê Whiskas para Gatos Adultos 85g Carne ao Molho”",
      },
    ],
    note: "Ficha da unidade de 85 g. Caixas e kits (ex.: “leve 12 pague 10”) são outras embalagens.",
  },
  {
    key: "nd-prime-gatos-adultos-frango-roma-1-5",
    brand: "Farmina",
    line: "N&D Prime",
    formula: "Gatos Adultos",
    species: "gatos",
    lifeStage: "adulto",
    size: null,
    flavor: "Frango e Romã",
    weightGrams: 1500,
    foodType: "natural",
    vetIndication: null,
    sources: [
      {
        url: "https://www.agrosolo.com.br/produto/racao-seca-farmina-ned-prime-para-gatos-adultos-de-todas-as-racas-sabor-frango-e-roma-1-5kg-90751",
        kind: "loja",
        evidence: "Título: “Ração Seca Farmina N&D Prime para Gatos Adultos de Todas as Raças Sabor Frango e Romã 1,5Kg”",
      },
      {
        url: "https://terrazoo.com.br/produto/racao-farmina-nd-prime-para-gatos-adultos-sabor-frango-e-roma-15kg/",
        kind: "loja",
        evidence: "Título: “Ração Farmina N&D Prime para Gatos Adultos Sabor Frango e Romã 1,5Kg”",
      },
    ],
    note: "Existe N&D Prime Gatos Adultos Castrados Frango e Romã 1,5 kg: outra fórmula, não vincular aqui.",
  },
  {
    key: "proplan-gatos-castrados-salmao-7-5",
    brand: "Purina",
    line: "Pro Plan",
    formula: "Gatos Adultos Castrados (Sterilized)",
    species: "gatos",
    lifeStage: "castrado",
    size: null,
    flavor: "Salmão",
    weightGrams: 7500,
    foodType: "seca",
    vetIndication: null,
    sources: [
      {
        url: "https://purina.com.br/proplan/gatos/sterilized/produto",
        kind: "fabricante",
        evidence: "Título: “Pro Plan® Castrados ração para gatos | Pro Plan Brasil” (sem peso no título)",
      },
      {
        url: "https://www.hiperzoo.com.br/racao-seca-purina-proplan-gatos-castrados-sabor-salmao-75kg",
        kind: "loja",
        evidence: "Título: “Ração Seca Purina ProPlan Gatos Castrados Sabor Salmão 7,5kg”",
      },
    ],
  },
  {
    key: "guabi-natural-gatos-castrados-salmao-cevada-7-5",
    brand: "Guabi Natural",
    line: "Guabi Natural",
    formula: "Gatos Adultos Castrados",
    species: "gatos",
    lifeStage: "castrado",
    size: null,
    flavor: "Salmão e Cevada",
    weightGrams: 7500,
    foodType: "natural",
    vetIndication: null,
    sources: [
      {
        url: "https://www.amazon.com.br/Natural-Adultos-Castrados-Salm%C3%A3o-Cevada/dp/B0843H1BYM",
        kind: "loja",
        evidence: "Título: “Guabi Natural -Ração Para Gatos Adultos Castrados Salmão e Cevada 7,5 kg”",
      },
      {
        url: "https://www.reidosanimais.com.br/racao-seca-guabi-natural-salmao-e-cevada-para-gatos-adultos-castrados-7-5kg",
        kind: "loja",
        evidence: "Título: “Ração Seca Guabi Natural Salmão e Cevada para Gatos Adultos Castrados - 7,5Kg”",
      },
    ],
  },
];
