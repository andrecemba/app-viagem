import type { Offer, Product, Settings, Store } from "./types";
import { divergence, hostOf, hostMatches } from "./validation";

export type AlertKind =
  | "preco_antigo"
  | "indisponivel"
  | "erro_importacao"
  | "sem_afiliado"
  | "afiliado_invalido"
  | "produto_incerto"
  | "divergencia_peso"
  | "divergencia_sabor"
  | "sem_preco";

export const ALERT_LABEL: Record<AlertKind, string> = {
  preco_antigo: "Preço antigo",
  indisponivel: "Anúncio indisponível",
  erro_importacao: "Erro de importação",
  sem_afiliado: "Sem link de afiliado",
  afiliado_invalido: "Link de afiliado inválido",
  produto_incerto: "Possível produto errado",
  divergencia_peso: "Peso diferente",
  divergencia_sabor: "Sabor diferente",
  sem_preco: "Sem preço",
};

/** Gravidade para ordenar: o que pode mostrar dado errado ao cliente vem primeiro. */
export const ALERT_ORDER: AlertKind[] = [
  "produto_incerto",
  "divergencia_peso",
  "divergencia_sabor",
  "afiliado_invalido",
  "erro_importacao",
  "preco_antigo",
  "indisponivel",
  "sem_preco",
  "sem_afiliado",
];

export interface OfferAlert {
  kind: AlertKind;
  detail: string;
}

export function hoursSince(iso: string | null, now: Date) {
  return iso ? (now.getTime() - new Date(iso).getTime()) / 3600_000 : Infinity;
}

export function isStale(offer: Pick<Offer, "priceObtainedAt">, settings: Pick<Settings, "staleHours">, now = new Date()) {
  return hoursSince(offer.priceObtainedAt, now) > settings.staleHours;
}

/** Alertas calculados na hora (não há o que deduplicar: cada condição aparece uma vez por oferta). */
export function offerAlerts(offer: Offer, product: Product, store: Store, settings: Settings, now = new Date()): OfferAlert[] {
  if (!offer.active) return [];
  const alerts: OfferAlert[] = [];
  if (offer.matchStatus === "incerta") alerts.push({ kind: "produto_incerto", detail: "Confirme se o anúncio é exatamente esta ração antes de manter no site." });
  const d = divergence(product.weightGrams, product.flavor, offer);
  if (d.weight) alerts.push({ kind: "divergencia_peso", detail: `Anúncio: ${offer.listingWeightGrams} g · produto: ${product.weightGrams} g.` });
  if (d.flavor) alerts.push({ kind: "divergencia_sabor", detail: `Anúncio: “${offer.listingFlavor}” · produto: “${product.flavor}”.` });
  if (offer.lastSyncStatus === "erro") {
    alerts.push({ kind: "erro_importacao", detail: `${offer.consecutiveFailures} falha(s) seguida(s): ${offer.lastSyncError ?? "erro desconhecido"}. O último preço válido foi mantido.` });
  }
  if (offer.price == null) alerts.push({ kind: "sem_preco", detail: "Sem preço: a oferta não entra na comparação." });
  else if (isStale(offer, settings, now)) {
    const h = Math.round(hoursSince(offer.priceObtainedAt, now));
    alerts.push({ kind: "preco_antigo", detail: `Preço obtido há ${h >= 48 ? `${Math.round(h / 24)} dias` : `${h} h`} (prazo: ${settings.staleHours} h).` });
  }
  if (offer.availability === "indisponivel") alerts.push({ kind: "indisponivel", detail: "O anúncio está indisponível na loja." });
  if (!offer.affiliateUrl) alerts.push({ kind: "sem_afiliado", detail: "Sem link de afiliado: o botão leva à URL comum e não gera comissão." });
  else {
    const host = hostOf(offer.affiliateUrl);
    if (!host || !hostMatches(host, [...store.domains, ...store.affiliateDomains])) {
      alerts.push({ kind: "afiliado_invalido", detail: `Link de afiliado fora dos domínios de ${store.name}.` });
    }
  }
  return alerts.sort((a, b) => ALERT_ORDER.indexOf(a.kind) - ALERT_ORDER.indexOf(b.kind));
}
