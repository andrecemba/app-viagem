import { DOG_SIZE_VALUES, FOOD_TYPE_VALUES, type DogSize, type FoodType, type LifeStage, type Species } from "@/lib/catalog/vocab";
import type { Db } from "@/lib/db/util";
import { parseBool, parseCsv, parsePrice } from "@/lib/integrations/csv";
import { sourceForStore } from "@/lib/integrations";
import type { NormalizedListing } from "@/lib/integrations/types";

import { createOffer } from "./offers";
import { getProduct, productName, saveProduct, type ProductInput } from "./products";
import { listStores } from "./stores";
import type { Availability, Store } from "./types";
import { identityKey, normalizeText, storeForUrl, ValidationError, weightFromTitle } from "./validation";

/**
 * Importação de planilha com produtos e ofertas (Produtos → Importar planilha).
 * Cada linha = uma ração + um anúncio. O que o arquivo não traz fica vazio e
 * aparece como “Pendente de verificação”; com a API da loja ligada, preço,
 * disponibilidade, frete grátis, peso, sabor e imagem vêm do anúncio oficial.
 * Nada é deduzido da URL além do ID do anúncio (o link de afiliado vem só da coluna própria).
 */

export const IMPORT_COLUMNS = [
  "especie",
  "marca",
  "linha",
  "indicacao",
  "sabor",
  "peso",
  "castrado",
  "idade",
  "porte",
  "tipo",
  "gtin",
  "link_anuncio",
  "id_anuncio",
  "preco",
  "disponivel",
  "frete_gratis",
  "link_afiliado",
  "observacao",
] as const;

export type ImportStatus = "importado" | "pendente" | "ja_existia" | "erro";

export interface ImportRowResult {
  line: number;
  status: ImportStatus;
  label: string;
  productId: number | null;
  offerId: number | null;
  /** Campos vazios ou não confirmados, para conferir no anúncio. */
  pending: string[];
  messages: string[];
}

/** Consulta o anúncio pela API oficial da loja; null quando a loja não tem API ativa. */
export type ListingLookup = (store: Store, externalId: string) => Promise<NormalizedListing | null>;

const pick = <T extends string>(value: string, map: Record<string, T>): T | null | undefined => {
  const v = normalizeText(value).replace(/[_-]+/g, " ").trim();
  if (!v) return null;
  return map[v];
};

const SPECIES: Record<string, Species> = { caes: "caes", cao: "caes", cachorro: "caes", cachorros: "caes", dog: "caes", gato: "gatos", gatos: "gatos", cat: "gatos" };
const LIFE: Record<string, LifeStage> = {
  filhote: "filhote",
  filhotes: "filhote",
  adulto: "adulto",
  adultos: "adulto",
  senior: "senior",
  idoso: "senior",
  idosos: "senior",
  todas: "todas",
  "todas as idades": "todas",
};
const SIZES: Record<string, DogSize> = {
  ...Object.fromEntries(DOG_SIZE_VALUES.map((s) => [s.replace("_", " "), s])),
  "mini e pequeno": "mini_pequeno",
  "mini e pequenos": "mini_pequeno",
  "medio e grande": "medio_grande",
  "medios e grandes": "medio_grande",
  "todos os portes": "todos",
} as Record<string, DogSize>;
const FOOD: Record<string, FoodType> = { ...Object.fromEntries(FOOD_TYPE_VALUES.map((f) => [f, f])), "racao seca": "seca" } as Record<string, FoodType>;

/** "2,5 kg", "800 g" ou só o número (em kg). */
export function parseWeight(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  if (/^\d+(?:[.,]\d+)?$/.test(v)) {
    const n = Number(v.replace(",", "."));
    return n > 0 ? Math.round(n * 1000) : null;
  }
  return weightFromTitle(v);
}

export async function importCatalogCsv(db: Db, text: string, actor: string, lookup?: ListingLookup): Promise<ImportRowResult[]> {
  const rows = parseCsv(text);
  if (!rows.length) throw new ValidationError("O arquivo está vazio.");
  const missing = ["especie", "marca", "indicacao", "peso", "link_anuncio"].filter((c) => !(c in rows[0]));
  if (missing.length) throw new ValidationError(`Faltam colunas no cabeçalho: ${missing.join(", ")}. Use o modelo da página.`);
  if (rows.length > 500) throw new ValidationError("Máximo de 500 linhas por arquivo.");

  const stores = listStores(db, { onlyActive: true });
  const results: ImportRowResult[] = [];

  for (const [i, row] of rows.entries()) {
    const line = i + 2;
    const r: ImportRowResult = { line, status: "pendente", label: [row.marca, row.linha, row.indicacao].filter(Boolean).join(" ") || "(sem nome)", productId: null, offerId: null, pending: [], messages: [] };
    results.push(r);
    try {
      // ── Anúncio: loja pelo domínio e ID extraído do link (ou da coluna) ──
      const url = (row.link_anuncio ?? "").trim();
      if (!url) {
        r.pending.push("link do anúncio");
        continue;
      }
      const store = storeForUrl(stores, url);
      if (!store) throw new ValidationError(`O link do anúncio não é de nenhuma loja cadastrada (${url.slice(0, 60)}…).`);
      const parsed = sourceForStore(store, db).parseListingUrl(url);
      const externalId = (row.id_anuncio ?? "").trim().toUpperCase() || parsed.externalId;

      // ── Dados oficiais do anúncio, quando a API está ligada ──
      let listing: NormalizedListing | null = null;
      if (lookup && externalId) {
        try {
          listing = await lookup(store, externalId);
          if (listing) r.messages.push(`Dados do anúncio ${externalId} lidos pela API do ${store.name}.`);
        } catch (e) {
          r.messages.push(`API do ${store.name} não respondeu (${e instanceof Error ? e.message : "erro"}): usados só os dados do arquivo.`);
        }
      }

      // ── Produto ──
      const species = pick(row.especie ?? "", SPECIES);
      if (species === undefined) throw new ValidationError(`Espécie “${row.especie}” não reconhecida (use Cachorro ou Gato).`);
      const lifeStage = pick(row.idade ?? "", LIFE);
      if (lifeStage === undefined) throw new ValidationError(`Idade “${row.idade}” não reconhecida (filhote, adulto, sênior ou todas).`);
      const size = pick(row.porte ?? "", SIZES);
      if (size === undefined) throw new ValidationError(`Porte “${row.porte}” não reconhecido (mini, pequeno, médio, grande, mini e pequeno, médio e grande ou todos).`);
      const foodType = pick(row.tipo ?? "", FOOD);
      if (foodType === undefined) throw new ValidationError(`Tipo “${row.tipo}” não reconhecido (seca, natural, úmida ou medicamentosa).`);

      let weight = parseWeight(row.peso ?? "");
      if (row.peso?.trim() && weight == null) throw new ValidationError(`Peso “${row.peso}” não entendido (ex.: 2,5 kg ou 800 g).`);
      if (weight == null && listing?.listingWeightGrams) {
        weight = listing.listingWeightGrams;
        r.messages.push("Peso da embalagem tirado do anúncio pela API.");
      }
      let flavor = (row.sabor ?? "").trim() || null;
      if (!flavor && listing?.listingFlavor) {
        flavor = listing.listingFlavor;
        r.messages.push("Sabor tirado do anúncio pela API.");
      }

      if (!species) r.pending.push("espécie");
      if (!row.marca?.trim()) r.pending.push("marca");
      if (!row.indicacao?.trim()) r.pending.push("indicação");
      if (weight == null) r.pending.push("peso da embalagem");
      if (!flavor) r.pending.push("sabor");
      // Sem os dados que identificam a ração, nada é gravado: o produto errado seria pior que nenhum.
      if (!species || !row.marca?.trim() || !row.indicacao?.trim() || weight == null) {
        r.messages.push("Linha não importada: preencha os campos pendentes e importe de novo.");
        continue;
      }

      const input: ProductInput = {
        species,
        brand: row.marca.trim(),
        line: row.linha?.trim() || null,
        indication: row.indicacao.trim(),
        flavor,
        weightGrams: weight,
        unitCount: null,
        neutered: parseBool(row.castrado) === true,
        lifeStage: lifeStage ?? null,
        size: size ?? null,
        foodType: foodType ?? null,
        needs: parseBool(row.castrado) === true ? ["castrados"] : [],
        gtin: row.gtin?.trim() || null,
        imageUrl: listing?.imageUrl ?? null,
        description: null,
        sources: [{ url, note: `Anúncio ${store.name}${externalId ? ` ${externalId}` : ""} (importação de planilha)` }],
        notes: row.observacao?.trim() || null,
        active: true,
      };

      // ── Oferta ──
      const price = listing?.price ?? parsePrice(row.preco);
      if (row.preco?.trim() && parsePrice(row.preco) == null) throw new ValidationError(`Preço “${row.preco}” inválido (ex.: 189,90).`);
      if (listing?.price != null && parsePrice(row.preco) != null && parsePrice(row.preco) !== listing.price) {
        r.messages.push(`Preço da planilha (${row.preco}) diferente do anúncio: vale o da API (${listing.price.toFixed(2).replace(".", ",")}).`);
      }
      if (price == null) r.pending.push("preço");
      const avail = parseBool(row.disponivel);
      const availability: Availability = listing?.availability ?? (avail == null ? "desconhecida" : avail ? "disponivel" : "indisponivel");
      const freeShipping = listing?.freeShipping ?? parseBool(row.frete_gratis);
      if (freeShipping == null) r.pending.push("selo de frete grátis");
      const affiliateUrl = (row.link_afiliado ?? "").trim() || null;
      if (!affiliateUrl) r.pending.push("link de afiliado");
      if (!externalId) r.pending.push("ID do anúncio");

      db.transaction(() => {
        const existing = db.prepare("SELECT id FROM products WHERE identity_key = ?").get(identityKey(input)) as { id: number } | undefined;
        const product = existing ? getProduct(db, existing.id)! : saveProduct(db, null, input);
        r.productId = product.id;
        r.label = productName(product);
        const dup = (
          externalId
            ? db.prepare("SELECT id FROM offers WHERE store_id = ? AND external_id = ?").get(store.id, externalId)
            : db.prepare("SELECT id FROM offers WHERE product_id = ? AND store_id = ? AND url = ?").get(product.id, store.id, url)
        ) as { id: number } | undefined;
        if (dup) {
          r.status = "ja_existia";
          r.offerId = dup.id;
          r.messages.push(`Este anúncio já estava cadastrado${existing ? "" : " (produto novo criado)"}: nada foi alterado na oferta.`);
          return;
        }
        const offer = createOffer(
          db,
          {
            productId: product.id,
            storeId: store.id,
            dataSource: listing ? "api" : "manual",
            externalId,
            url,
            affiliateUrl,
            price,
            previousPrice: null,
            previousPriceAt: null,
            availability,
            freeShipping,
            listingTitle: listing?.title ?? null,
            // Sem API, o peso e o sabor da planilha são os do anúncio conferido pelo admin.
            listingWeightGrams: listing ? listing.listingWeightGrams : weight,
            listingFlavor: listing ? listing.listingFlavor : flavor,
            imageUrl: listing?.imageUrl ?? null,
            notes: r.pending.length ? `Pendente de verificação: ${r.pending.join(", ")}.` : null,
            priceSource: listing ? `api:${store.adapter}` : "manual",
          },
          actor,
        );
        r.offerId = offer.id;
        if (existing) r.messages.push("Produto já existia: oferta adicionada a ele.");
        if (offer.matchStatus === "incerta") r.messages.push("Peso ou sabor do anúncio diferente do produto: oferta marcada para revisão.");
        r.status = r.pending.length ? "pendente" : "importado";
      })();
    } catch (e) {
      r.status = "erro";
      r.messages.push(e instanceof ValidationError ? e.message : "Erro inesperado ao gravar a linha.");
      if (!(e instanceof ValidationError)) console.error("[importação]", e);
    }
  }
  return results;
}
