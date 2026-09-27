import "server-only";

import { mockSource } from "./mock-source";
import type { DataSource } from "./types";

/**
 * Ponto único de acesso a dados. Na Fase 1, trocar por:
 *   const source = process.env.DATA_SOURCE === "supabase" ? supabaseSource : mockSource;
 * Os componentes só importam as funções abaixo e não mudam.
 */
const source: DataSource = mockSource;

export const getCategories = source.getCategories;
export const getStores = source.getStores;
export const getBrands = source.getBrands;
export const getBrandPage = source.getBrandPage;
export const getOffers = source.getOffers;
export const getFunnelCounts = source.getFunnelCounts;
export const getTopDeals = source.getTopDeals;
export const getProduct = source.getProduct;
export const getRelated = source.getRelated;
export const getMonthlyKit = source.getMonthlyKit;
export const getOutboundTarget = source.getOutboundTarget;
export const getCalculatorProducts = source.getCalculatorProducts;
export const getProductSlugs = source.getProductSlugs;
export const getComparatorItems = source.getComparatorItems;

export type * from "./types";
