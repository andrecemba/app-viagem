export type AffiliateTagCategory = "racao" | "petisco" | "complementar";

export interface AffiliateConfig {
  amazon: {
    /** Tags por categoria para medir desempenho; `default` é o fallback. */
    tags: Partial<Record<AffiliateTagCategory | "default", string>>;
  };
  awin: {
    affiliateId: string | null;
    /** storeSlug → awinmid (ID do anunciante na Awin). */
    merchantIds: Record<string, string>;
  };
}

type Env = Record<string, string | undefined>;

export function getAffiliateConfigFromEnv(env: Env = process.env): AffiliateConfig {
  const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
  const merchantIds: Record<string, string> = {};
  const cobasi = clean(env.AWIN_MID_COBASI);
  if (cobasi) merchantIds.cobasi = cobasi;
  return {
    amazon: {
      tags: {
        racao: clean(env.AMAZON_TAG_RACAO),
        petisco: clean(env.AMAZON_TAG_PETISCO),
        complementar: clean(env.AMAZON_TAG_COMPLEMENTAR),
        default: clean(env.AMAZON_TAG_DEFAULT),
      },
    },
    awin: { affiliateId: clean(env.AWIN_AFFILIATE_ID) ?? null, merchantIds },
  };
}

/** Valores de demonstração usados SOMENTE com os dados de exemplo (Fase 0). */
export const DEMO_AFFILIATE_CONFIG: AffiliateConfig = {
  amazon: { tags: { racao: "exemplo-racao-20", petisco: "exemplo-petisco-20", complementar: "exemplo-acess-20", default: "exemplo-20" } },
  awin: { affiliateId: "000000", merchantIds: { cobasi: "00000" } },
};

export function mergeAffiliateConfig(base: AffiliateConfig, override: AffiliateConfig): AffiliateConfig {
  const pick = <T,>(a: T | undefined, b: T | undefined) => (a !== undefined ? a : b);
  return {
    amazon: {
      tags: {
        racao: pick(override.amazon.tags.racao, base.amazon.tags.racao),
        petisco: pick(override.amazon.tags.petisco, base.amazon.tags.petisco),
        complementar: pick(override.amazon.tags.complementar, base.amazon.tags.complementar),
        default: pick(override.amazon.tags.default, base.amazon.tags.default),
      },
    },
    awin: {
      affiliateId: override.awin.affiliateId ?? base.awin.affiliateId,
      merchantIds: { ...base.awin.merchantIds, ...override.awin.merchantIds },
    },
  };
}
