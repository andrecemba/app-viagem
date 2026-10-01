import { NEEDS, DOG_SIZE_VALUES, FOOD_TYPE_VALUES, LIFE_STAGE_VALUES, formatGrams } from "@/lib/catalog/vocab";
import { nowIso, parseJson, type Db } from "@/lib/db/util";

import type { Product } from "./types";
import { hostOf, identityKey, isValidGtin, normalizeText, slugify, ValidationError } from "./validation";

interface ProductRow {
  id: number;
  slug: string;
  identity_key: string;
  species: Product["species"];
  brand: string;
  line: string | null;
  indication: string;
  flavor: string | null;
  weight_grams: number;
  unit_count: number | null;
  neutered: number;
  life_stage: Product["lifeStage"];
  size: Product["size"];
  food_type: Product["foodType"];
  needs: string;
  gtin: string | null;
  image_url: string | null;
  description: string | null;
  sources: string;
  notes: string | null;
  active: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    species: r.species,
    brand: r.brand,
    line: r.line,
    indication: r.indication,
    flavor: r.flavor,
    weightGrams: r.weight_grams,
    unitCount: r.unit_count,
    neutered: Boolean(r.neutered),
    lifeStage: r.life_stage,
    size: r.size,
    foodType: r.food_type,
    needs: parseJson(r.needs, []),
    gtin: r.gtin,
    imageUrl: r.image_url,
    description: r.description,
    sources: parseJson(r.sources, []),
    notes: r.notes,
    active: Boolean(r.active),
    isDemo: Boolean(r.is_demo),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** "Golden Fórmula Cães Adultos Raças Médias · Frango e Arroz · 15 kg" */
export function productName(p: Pick<Product, "brand" | "line" | "indication" | "flavor" | "weightGrams" | "neutered">, withWeight = true) {
  const line = p.line && normalizeText(p.line).startsWith(normalizeText(p.brand)) ? p.line : [p.brand, p.line].filter(Boolean).join(" ");
  let indication = p.neutered && !/castrad/i.test(p.indication) ? `${p.indication} Castrados` : p.indication;
  // "Golden Gatos" + "Gatos Adultos" → "Golden Gatos Adultos" (sem repetir a palavra).
  const lastWord = line.split(" ").at(-1) ?? "";
  const [firstWord, ...rest] = indication.split(" ");
  if (rest.length && normalizeText(lastWord) === normalizeText(firstWord)) indication = rest.join(" ");
  return [`${line} ${indication}`.trim(), p.flavor, withWeight ? formatGrams(p.weightGrams) : null].filter(Boolean).join(" · ");
}

export function listProducts(db: Db, opts: { onlyActive?: boolean } = {}): Product[] {
  const rows = db.prepare(`SELECT * FROM products ${opts.onlyActive ? "WHERE active = 1" : ""} ORDER BY brand, line, indication, flavor, weight_grams`).all() as ProductRow[];
  return rows.map(toProduct);
}

export function getProduct(db: Db, idOrSlug: number | string): Product | null {
  const r = (typeof idOrSlug === "number"
    ? db.prepare("SELECT * FROM products WHERE id = ?").get(idOrSlug)
    : db.prepare("SELECT * FROM products WHERE slug = ?").get(idOrSlug)) as ProductRow | undefined;
  return r ? toProduct(r) : null;
}

export type ProductInput = Omit<Product, "id" | "slug" | "createdAt" | "updatedAt" | "isDemo">;

function validate(input: ProductInput) {
  if (!input.brand.trim()) throw new ValidationError("Informe a marca.");
  if (!input.indication.trim()) throw new ValidationError("Informe a indicação (ex.: Adultos Raças Médias, Filhotes).");
  if (!Number.isInteger(input.weightGrams) || input.weightGrams < 10 || input.weightGrams > 50000) {
    throw new ValidationError("Peso inválido: informe o peso da embalagem entre 10 g e 50 kg.");
  }
  if (input.unitCount != null && (!Number.isInteger(input.unitCount) || input.unitCount < 1 || input.unitCount > 200)) {
    throw new ValidationError("Quantidade de unidades inválida.");
  }
  if (input.gtin && !isValidGtin(input.gtin)) throw new ValidationError("GTIN/EAN inválido: confira os dígitos (8, 12, 13 ou 14, com dígito verificador).");
  if (input.imageUrl && !hostOf(input.imageUrl)) throw new ValidationError("A imagem precisa ser um endereço https://.");
  for (const s of input.sources) if (!hostOf(s.url)) throw new ValidationError(`Fonte inválida (use https://): ${s.url}`);
  if (input.lifeStage && !LIFE_STAGE_VALUES.includes(input.lifeStage)) throw new ValidationError("Idade inválida.");
  if (input.size && !DOG_SIZE_VALUES.includes(input.size)) throw new ValidationError("Porte inválido.");
  if (input.foodType && !FOOD_TYPE_VALUES.includes(input.foodType)) throw new ValidationError("Tipo inválido.");
  if (input.needs.some((n) => !NEEDS.includes(n))) throw new ValidationError("Indicação desconhecida.");
}

function uniqueSlug(db: Db, input: ProductInput, selfId: number | null) {
  const base = slugify(productName({ ...input, weightGrams: input.weightGrams }).replace(/·/g, " ")) || "racao";
  let slug = base;
  for (let i = 2; ; i++) {
    const other = db.prepare("SELECT id FROM products WHERE slug = ?").get(slug) as { id: number } | undefined;
    if (!other || other.id === selfId) return slug;
    slug = `${base}-${i}`;
  }
}

export function saveProduct(db: Db, id: number | null, raw: ProductInput, opts: { isDemo?: boolean } = {}): Product {
  const input: ProductInput = {
    ...raw,
    brand: raw.brand.trim(),
    line: raw.line?.trim() || null,
    indication: raw.indication.trim(),
    flavor: raw.flavor?.trim() || null,
    size: raw.species === "gatos" ? null : raw.size,
    gtin: raw.gtin?.replace(/\D/g, "") || null,
  };
  validate(input);
  const key = identityKey(input);
  const dup = db.prepare("SELECT id, slug FROM products WHERE identity_key = ?").get(key) as { id: number; slug: string } | undefined;
  if (dup && dup.id !== id) {
    throw new ValidationError("Já existe um produto com a mesma espécie, marca, linha, indicação, sabor e peso. Edite o existente ou mude o que os diferencia.");
  }
  if (input.gtin) {
    const g = db.prepare("SELECT id FROM products WHERE gtin = ? AND id != ?").get(input.gtin, id ?? -1) as { id: number } | undefined;
    if (g) throw new ValidationError("Este GTIN/EAN já está em outro produto. Cada embalagem tem um código próprio.");
  }
  const now = nowIso();
  const values = {
    identity_key: key,
    species: input.species,
    brand: input.brand,
    line: input.line,
    indication: input.indication,
    flavor: input.flavor,
    weight_grams: input.weightGrams,
    unit_count: input.unitCount,
    neutered: input.neutered ? 1 : 0,
    life_stage: input.lifeStage,
    size: input.size,
    food_type: input.foodType,
    needs: JSON.stringify(input.needs),
    gtin: input.gtin,
    image_url: input.imageUrl,
    description: input.description,
    sources: JSON.stringify(input.sources),
    notes: input.notes,
    active: input.active ? 1 : 0,
    updated_at: now,
  };
  if (id == null) {
    const r = db
      .prepare(
        `INSERT INTO products (slug, identity_key, species, brand, line, indication, flavor, weight_grams, unit_count, neutered, life_stage, size,
          food_type, needs, gtin, image_url, description, sources, notes, active, is_demo, created_at, updated_at)
         VALUES (@slug, @identity_key, @species, @brand, @line, @indication, @flavor, @weight_grams, @unit_count, @neutered, @life_stage, @size,
          @food_type, @needs, @gtin, @image_url, @description, @sources, @notes, @active, @is_demo, @created_at, @updated_at)`,
      )
      .run({ ...values, slug: uniqueSlug(db, input, null), is_demo: opts.isDemo ? 1 : 0, created_at: now });
    return getProduct(db, Number(r.lastInsertRowid))!;
  }
  const current = getProduct(db, id);
  if (!current) throw new ValidationError("Produto não encontrado.");
  db.prepare(
    `UPDATE products SET identity_key = @identity_key, species = @species, brand = @brand, line = @line, indication = @indication, flavor = @flavor,
      weight_grams = @weight_grams, unit_count = @unit_count, neutered = @neutered, life_stage = @life_stage, size = @size, food_type = @food_type,
      needs = @needs, gtin = @gtin, image_url = @image_url, description = @description, sources = @sources, notes = @notes, active = @active,
      updated_at = @updated_at WHERE id = @id`,
  ).run({ ...values, id });
  return getProduct(db, id)!;
}

export function setProductActive(db: Db, id: number, active: boolean) {
  db.prepare("UPDATE products SET active = ?, updated_at = ? WHERE id = ?").run(active ? 1 : 0, nowIso(), id);
}
