import { beforeAll, describe, expect, it, vi } from "vitest";

import { facetCounts, matchesFilters, readUrlState, writeUrlState } from "@/lib/comparator/filters";
import { buildSearchIndex, editDistance, parseQuery, searchItems, type SearchIndex } from "@/lib/comparator/search";
import type { ComparatorItem } from "@/lib/comparator/types";

vi.mock("server-only", () => ({}));

let items: ComparatorItem[];
let index: SearchIndex;

beforeAll(async () => {
  const { getComparatorItems } = await import("@/lib/data");
  items = await getComparatorItems();
  index = buildSearchIndex(items);
});

const titles = (list: ComparatorItem[]) => list.map((i) => `${i.title} · ${i.flavor} · ${i.netWeightGrams}`);

describe("parseQuery", () => {
  it("reconhece o peso em vários formatos", () => {
    expect(parseQuery("Golden frango 15 kg").weightGrams).toBe(15000);
    expect(parseQuery("golden 15kg").weightGrams).toBe(15000);
    expect(parseQuery("n&d 10,1kg").weightGrams).toBe(10100);
    expect(parseQuery("whiskas 500 g").weightGrams).toBe(500);
    expect(parseQuery("golden 15").weightGrams).toBe(15000);
  });

  it("ignora acentos, plurais e palavras genéricas", () => {
    expect(parseQuery("Ração para GATOS castrados").terms.map((t) => t.token)).toEqual(["gato", "castrado"]);
    expect(parseQuery("cachorro salmão").terms.map((t) => t.token)).toEqual(["cao", "salmao"]);
  });
});

describe("editDistance", () => {
  it("conta transposição como um erro", () => {
    expect(editDistance("golden", "goldne")).toBe(1);
    expect(editDistance("royal", "royla")).toBe(1);
  });
});

describe("searchItems", () => {
  it("encontra a embalagem exata de Golden frango 15 kg", () => {
    const r = searchItems(index, "Golden frango 15 kg");
    expect(r.mode).toBe("exact");
    expect(r.items.length).toBeGreaterThan(0);
    for (const i of r.items) {
      expect(i.brand.slug).toBe("golden");
      expect(i.netWeightGrams).toBe(15000);
      expect(i.flavor.toLowerCase()).toContain("frango");
    }
  });

  it("aceita nome incompleto: Royal Mini", () => {
    const r = searchItems(index, "Royal Mini");
    expect(r.mode).toBe("exact");
    expect(titles(r.items).every((t) => t.includes("Royal Canin Mini"))).toBe(true);
    // Cada peso é um item separado.
    const weights = r.items.filter((i) => i.title === "Royal Canin Mini Adult").map((i) => i.netWeightGrams);
    expect(new Set(weights).size).toBe(weights.length);
    expect(weights.length).toBeGreaterThanOrEqual(3);
  });

  it("busca por tipo: ração gato castrado", () => {
    const r = searchItems(index, "ração gato castrado");
    expect(r.mode).toBe("exact");
    expect(r.items.every((i) => i.species === "gatos" && i.lifeStages.includes("castrado"))).toBe(true);
  });

  it("tolera erros de digitação e informa a correção", () => {
    const r = searchItems(index, "goldem frnago");
    expect(r.mode).toBe("exact");
    expect(r.items[0].brand.slug).toBe("golden");
    expect(r.corrections.map((c) => c.suggestion)).toEqual(expect.arrayContaining(["golden", "frango"]));
  });

  it("corrige erro em palavras como cachorro e filhote", () => {
    const r = searchItems(index, "cachoro filhtoe");
    expect(r.mode).toBe("exact");
    expect(r.items.every((i) => i.species === "caes" && i.lifeStages.includes("filhote"))).toBe(true);
    expect(r.corrections.map((c) => c.suggestion)).toEqual(["cachorro", "filhote"]);
  });

  it("tolera letras trocadas e sem acento", () => {
    expect(searchItems(index, "royla canin").items[0].brand.slug).toBe("royal-canin");
    expect(searchItems(index, "premier gatos castrados salmao").items[0].brand.slug).toBe("premier");
    expect(searchItems(index, "equilibrio senior").items[0].brand.slug).toBe("equilibrio");
  });

  it("mostra os mais próximos quando o peso não existe", () => {
    const r = searchItems(index, "Golden frango 12 kg");
    expect(r.mode).toBe("closest");
    expect(r.items[0].brand.slug).toBe("golden");
  });

  it("mostra os mais próximos quando parte da busca não existe", () => {
    const r = searchItems(index, "golden cordeiro");
    expect(r.mode).toBe("closest");
    expect(r.unknownTerms).toContain("cordeiro");
    expect(r.items[0].brand.slug).toBe("golden");
  });

  it("não retorna nada para texto sem relação", () => {
    expect(searchItems(index, "xyzw qqqq").mode).toBe("none");
  });

  it("junta palavras separadas do nome da marca", () => {
    expect(searchItems(index, "gran plus").items[0].brand.slug).toBe("granplus");
  });
});

describe("filtros", () => {
  it("combina espécie, tipo e peso", () => {
    const f = { species: "gatos" as const, kind: "seca" as const, weight: 10100 };
    const list = items.filter((i) => matchesFilters(i, f));
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((i) => i.species === "gatos" && i.kind === "seca" && i.netWeightGrams === 10100)).toBe(true);
  });

  it("porte nunca inclui gatos", () => {
    expect(items.filter((i) => matchesFilters(i, { size: "mini" })).some((i) => i.species === "gatos")).toBe(false);
  });

  it("conta opções mantendo os outros filtros", () => {
    const counts = facetCounts(items, { species: "caes", brand: "golden" }, "weight");
    const golden = items.filter((i) => i.species === "caes" && i.brand.slug === "golden");
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(golden.length);
  });

  it("URL ida e volta", () => {
    const state = { query: "golden 15kg", filters: { species: "caes" as const, weight: 15000 }, sort: null, item: null };
    const qs = writeUrlState(state);
    const back = readUrlState(Object.fromEntries(new URLSearchParams(qs)));
    expect(back.query).toBe("golden 15kg");
    expect(back.filters).toMatchObject({ species: "caes", weight: 15000 });
  });
});
