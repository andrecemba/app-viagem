/** Configurações gerais do site. Nome e URL podem vir de variáveis de ambiente. */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Ração Certa",
  tagline: "Compare o preço da ração que você já compra",
  description:
    "Compare o preço da mesma ração para cães e gatos no Mercado Livre, Shopee, Amazon, Petz, Cobasi e Petlove, com preço por kg e horário de atualização.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "pt-BR",
  currency: "BRL",
  affiliateDisclaimer:
    "Alguns links são de afiliado: podemos receber comissão se você comprar, sem custo extra. Isso não muda a ordem das lojas. O preço válido é o da loja no momento da compra.",
};
