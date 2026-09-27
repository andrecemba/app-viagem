import type { StoreConfig } from "@/lib/admin/types";

/**
 * Lojas e regras de consulta. Nenhuma integração vem ativa: cada uma só pode
 * ser ligada com credenciais próprias e dentro das condições da plataforma.
 * Não há coleta de páginas (scraping) prevista para nenhuma loja.
 */
export const defaultStores: StoreConfig[] = [
  {
    id: "amazon",
    name: "Amazon",
    domains: ["amazon.com.br", "amzn.to"],
    frequencyHours: 48,
    staleAfterHours: 72,
    hideStaleAfterHours: 168,
    integration: {
      kind: "api_oficial",
      description: "API oficial do Amazon Associados (Creators API) para consulta de preço e disponibilidade por ASIN.",
      requiredEnv: ["AMAZON_CREATORS_API_CLIENT_ID", "AMAZON_CREATORS_API_CLIENT_SECRET", "AMAZON_TAG_RACAO"],
      terms:
        "Exige conta aprovada no programa e respeita os limites de requisição e as regras de exibição de preço (data/hora da consulta).",
    },
    affiliateProgram: "Amazon Associados",
  },
  {
    id: "mercado-livre",
    name: "Mercado Livre",
    domains: ["mercadolivre.com.br", "mercadolivre.com", "produto.mercadolivre.com.br"],
    frequencyHours: 48,
    staleAfterHours: 72,
    hideStaleAfterHours: 168,
    integration: {
      kind: "api_oficial",
      description: "API de itens do Mercado Livre com aplicativo registrado (OAuth). Links de afiliado são gerados no painel de afiliados.",
      requiredEnv: ["MERCADOLIVRE_CLIENT_ID", "MERCADOLIVRE_CLIENT_SECRET", "MERCADOLIVRE_REFRESH_TOKEN"],
      terms: "Uso restrito às permissões do aplicativo aprovado; respeitar limites de requisição.",
    },
    affiliateProgram: "Mercado Livre Afiliados",
  },
  {
    id: "cobasi",
    name: "Cobasi",
    domains: ["cobasi.com.br"],
    frequencyHours: 48,
    staleAfterHours: 72,
    hideStaleAfterHours: null,
    integration: {
      kind: "feed_afiliado",
      description: "Feed de produtos da rede de afiliados, se a participação for aprovada.",
      requiredEnv: ["AWIN_API_TOKEN", "AWIN_AFFILIATE_ID", "AWIN_MID_COBASI"],
      terms: "Depende de aprovação do anunciante na rede; usar somente o feed e os links fornecidos por ela.",
    },
    affiliateProgram: "Rede de afiliados (a confirmar)",
  },
  {
    id: "petz",
    name: "Petz",
    domains: ["petz.com.br"],
    frequencyHours: 48,
    staleAfterHours: 96,
    hideStaleAfterHours: null,
    integration: {
      kind: "somente_manual",
      description: "Sem fonte de dados autorizada confirmada. Preços e links são cadastrados manualmente.",
      requiredEnv: [],
      terms: "Verificar se o programa de parceiros oferece feed ou API antes de automatizar.",
    },
    affiliateProgram: "Programa de parceiros (a confirmar)",
  },
  {
    id: "petlove",
    name: "Petlove",
    domains: ["petlove.com.br"],
    frequencyHours: 48,
    staleAfterHours: 96,
    hideStaleAfterHours: null,
    integration: {
      kind: "somente_manual",
      description: "Sem fonte de dados autorizada confirmada. Cadastro manual.",
      requiredEnv: [],
      terms: "Verificar existência de programa de afiliados e condições de uso de dados.",
    },
    affiliateProgram: null,
  },
];
