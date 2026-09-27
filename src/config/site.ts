/**
 * Configurações gerais. O nome é provisório ({{NOME_DO_SITE}}) — troque aqui
 * ou pela variável NEXT_PUBLIC_SITE_NAME.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Ração Certa",
  tagline: "Compare o preço da ração em Curitiba e região",
  description:
    "Compare o preço de rações para cães e gatos em lojas que atendem Curitiba e região. Encontre a embalagem exata e veja as ofertas lado a lado.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "pt-BR",
  currency: "BRL",
  /** Mostra o banner "Dados de exemplo" enquanto a camada de dados usa mocks. */
  isMockData: true,
  checkIntervalLabel: "a cada 2 dias",
  /**
   * Botões de compra só levam à loja quando houver links de afiliado reais.
   * Enquanto for false, aparecem desabilitados como "Link da loja em breve".
   */
  outboundLinksEnabled: false,
  affiliateDisclaimer:
    "Este site contém links de afiliado: podemos receber comissão por compras, sem custo extra para você. O preço válido é o da loja no momento da compra.",
};

export const topCategories = [
  { slug: "alimentacao", label: "Ração", href: "/", status: "active" as const },
  { slug: "areia-e-higiene", label: "Areia e higiene", href: null, status: "coming_soon" as const },
  { slug: "mercado", label: "Mercado", href: null, status: "coming_soon" as const },
];
