import { NO_CAPABILITIES, type OfferSource } from "../types";

/**
 * Amazon: o preço só pode ser exibido quando vier da API oficial do Associados
 * (hoje, Creators API), com a data da consulta e dentro do prazo de validade
 * das regras do programa. A API exige conta aprovada (com vendas qualificadas).
 * Enquanto não houver acesso aprovado e implementação conferida com a
 * documentação da conta, a integração fica "pendente": o site mostra a oferta
 * sem preço, com o botão para ver na Amazon. Nenhum preço é importado.
 */

export function parseAmazonUrl(url: string) {
  try {
    const m = new URL(url).pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
    if (m) return { externalId: m[1].toUpperCase() };
  } catch {
    return { externalId: null, hint: "URL inválida." };
  }
  return { externalId: null, hint: "Não encontramos o ASIN (10 caracteres após /dp/). Digite-o no campo abaixo." };
}

export function createAmazonSource({ env }: { env: Record<string, string | undefined> }): OfferSource {
  const required = ["AMAZON_CREATORS_API_CLIENT_ID", "AMAZON_CREATORS_API_CLIENT_SECRET", "AMAZON_ASSOCIATE_TAG"];
  return {
    id: "amazon",
    label: "Amazon (API do Associados)",
    kind: "api",
    terms:
      "Preço da Amazon só aparece no site se vier da API oficial, com horário e dentro da validade exigida pelo programa. Sem acesso aprovado, a oferta fica sem preço público.",
    status() {
      const missing = required.filter((k) => !env[k]);
      return {
        state: "pendente",
        missingEnv: missing,
        note: missing.length
          ? "Aguardando acesso à API do Amazon Associados (exige conta aprovada)."
          : "Credenciais presentes, mas a consulta ainda não foi implementada: conferir a documentação da Creators API da sua conta antes de ligar.",
      };
    },
    capabilities: () => NO_CAPABILITIES,
    parseListingUrl: parseAmazonUrl,
  };
}
