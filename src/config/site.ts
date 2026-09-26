/**
 * Configurações gerais. O nome é provisório ({{NOME_DO_SITE}}) — troque aqui
 * ou pela variável NEXT_PUBLIC_SITE_NAME.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Pote Cheio",
  tagline: "Onde a ração do seu pet está mais barata hoje",
  description:
    "Compare o preço por kg de rações, sachês e petiscos para cães e gatos nas principais lojas do Brasil. Preços verificados automaticamente a cada 2 dias.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "pt-BR",
  currency: "BRL",
  /** Mostra o banner "Dados de exemplo" enquanto a camada de dados usa mocks. */
  isMockData: true,
  checkIntervalLabel: "a cada 2 dias",
  affiliateDisclaimer:
    "Este site contém links de afiliado: podemos receber comissão por compras, sem custo extra para você. O preço válido é o da loja no momento da compra.",
};

export const topCategories = [
  { slug: "alimentacao", label: "Alimentação", href: "/", status: "active" as const },
  { slug: "areia-e-higiene", label: "Areia e higiene", href: null, status: "coming_soon" as const },
  { slug: "mercado", label: "Mercado", href: null, status: "coming_soon" as const },
];
