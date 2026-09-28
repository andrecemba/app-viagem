import type { DogSize, FoodType, LifeStage, Species } from "@/lib/catalog/vocab";
import { IMPORT_COLUMNS } from "@/lib/domain/catalog-import";
import { normalizeText, weightFromTitle } from "@/lib/domain/validation";

/**
 * Catálogo do Mercado Livre → linhas da planilha de importação (Produtos → Importar planilha).
 * Só usa os atributos oficiais do produto de catálogo; o que falta fica de fora
 * (a linha é pulada com o motivo), nunca é adivinhado.
 */

export const FOOD_DOMAIN = "MLB-CAT_AND_DOG_FOODS";
export const CATALOG_COLUMNS = ["nome_mercado_livre", ...IMPORT_COLUMNS] as const;

export interface MlCatalogProduct {
  id?: string;
  name?: string;
  domain_id?: string;
  attributes?: { id: string; value_name?: string | null }[];
}

export type CatalogRow = Record<(typeof CATALOG_COLUMNS)[number], string>;

const LIFE_LABEL: Record<LifeStage, string> = { filhote: "Filhotes", adulto: "Adultos", senior: "Sênior", todas: "Todas as idades" };
const SIZE_LABEL: Partial<Record<DogSize, string>> = {
  mini: "Mini",
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  mini_pequeno: "Mini e Pequeno",
  medio_grande: "Médio e Grande",
};
const SIZE_WORD: Record<DogSize, string> = {
  mini: "mini",
  pequeno: "pequeno",
  medio: "médio",
  grande: "grande",
  mini_pequeno: "mini e pequeno",
  medio_grande: "médio e grande",
  todos: "todos",
};

function speciesOf(text: string): Species | null {
  const dog = /\b(caes|cao|cachorros?|dogs?|canin[oa]s?)\b/.test(text);
  const cat = /\b(gat[oa]s?|cats?|felin[oa]s?)\b/.test(text);
  return dog === cat ? null : dog ? "caes" : "gatos";
}

function lifeOf(text: string): LifeStage | null {
  const pup = /\b(filhotes?|puppy|junior|kitten)\b/.test(text);
  const adult = /\badult/.test(text);
  const senior = /\b(senior|idosos?|mature)\b/.test(text) || /\b7\s*(anos|mais)\b/.test(text);
  if (/\btodas\b/.test(text) || (pup && adult)) return "todas";
  if (senior && !pup) return "senior";
  if (pup) return "filhote";
  if (adult) return "adulto";
  return null;
}

function sizeOf(text: string): DogSize | null {
  const mini = /\b(mini|toy)\b/.test(text);
  const small = /\bpequen/.test(text);
  const medium = /\bmedi[oa]s?\b/.test(text);
  const big = /\b(grandes?|gigantes?)\b/.test(text);
  if (/\btod[oa]s\b/.test(text)) return "todos";
  if ((mini || small) && (medium || big)) return "todos";
  if (mini && small) return "mini_pequeno";
  if (medium && big) return "medio_grande";
  if (mini) return "mini";
  if (small) return "pequeno";
  if (medium) return "medio";
  if (big) return "grande";
  return null;
}

function foodTypeOf(text: string): FoodType | null {
  if (/\bsec[oa]\b/.test(text)) return "seca";
  if (/\b(umid[oa]|sache|pate|lata)\b/.test(text)) return "umida";
  if (/\bnatural\b/.test(text)) return "natural";
  return null;
}

function kg(grams: number) {
  return `${String(grams / 1000).replace(".", ",")} kg`;
}

export function catalogRow(p: MlCatalogProduct): { row: CatalogRow } | { skip: string } {
  if (!p.id || !p.name) return { skip: "sem nome" };
  if (p.domain_id && p.domain_id !== FOOD_DOMAIN) return { skip: "não é ração" };
  const attr = (id: string) => p.attributes?.find((a) => a.id === id)?.value_name?.trim() || "";
  const name = normalizeText(p.name);

  const units = Number(attr("UNITS_PER_PACK") || "1");
  if (units > 1 || /\bkit\b/.test(normalizeText(attr("SALE_FORMAT")))) return { skip: "kit com várias embalagens" };

  const species = speciesOf(normalizeText(attr("RECOMMENDED_PET"))) ?? speciesOf(name);
  if (!species) return { skip: "espécie (cão ou gato) não definida" };

  const brand = attr("BRAND");
  if (!brand) return { skip: "sem marca" };

  const weight = weightFromTitle(attr("NET_WEIGHT")) ?? weightFromTitle(p.name);
  if (!weight) return { skip: "sem peso da embalagem" };

  const life = lifeOf(normalizeText(attr("PET_LIFE_STAGE"))) ?? lifeOf(name);
  const size = species === "caes" ? (sizeOf(normalizeText(attr("BREED_SIZE"))) ?? sizeOf(name)) : null;
  const neutered = /\bcastrad/.test(normalizeText(`${attr("SPECIAL_NEEDS")} ${p.name}`));
  if (!life && (!size || size === "todos")) return { skip: "sem idade nem porte (indicação)" };

  const indication = [life ? LIFE_LABEL[life] : null, size ? SIZE_LABEL[size] : null, neutered ? "Castrados" : null].filter(Boolean).join(" ");
  const flavorRaw = attr("FLAVOR");
  const flavor = /^(sem sabor|nao se aplica|nao aplica|n a|sabor unico|original)$/.test(normalizeText(flavorRaw)) ? "" : flavorRaw;
  const foodType = foodTypeOf(normalizeText(attr("PET_FOOD_TYPE")));

  return {
    row: {
      nome_mercado_livre: p.name,
      especie: species === "caes" ? "Cachorro" : "Gato",
      marca: brand,
      linha: attr("LINE"),
      indicacao: indication,
      sabor: flavor,
      peso: kg(weight),
      castrado: neutered ? "sim" : "não",
      idade: life ? (life === "todas" ? "todas" : life === "senior" ? "sênior" : life) : "",
      porte: size ? SIZE_WORD[size] : "",
      tipo: foodType ?? "",
      gtin: attr("GTIN").split(/[,;\s]+/)[0] ?? "",
      link_anuncio: `https://www.mercadolivre.com.br/p/${p.id}`,
      id_anuncio: p.id,
      preco: "",
      disponivel: "",
      frete_gratis: "",
      link_afiliado: "",
      observacao: "",
    },
  };
}

/** CSV com ";" (abre direto no Excel em português) e BOM para os acentos. */
export function toCsv(rows: CatalogRow[]): string {
  const cell = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + [CATALOG_COLUMNS.join(";"), ...rows.map((r) => CATALOG_COLUMNS.map((c) => cell(r[c] ?? "")).join(";"))].join("\r\n") + "\r\n";
}
