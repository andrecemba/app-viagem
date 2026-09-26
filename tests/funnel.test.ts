import { describe, expect, it } from "vitest";

import {
  buildFilterQuery,
  buildFunnelPath,
  currentStep,
  parseFilterParams,
  parseFunnelPath,
} from "@/lib/funnel/filters";

const brands = ["golden", "royal-canin", "whiskas"];

describe("parseFunnelPath", () => {
  it("lê o caminho completo", () => {
    expect(parseFunnelPath(["caes", "racao-seca", "adulto", "medio", "golden"], brands)).toEqual({
      species: "caes",
      foodType: "racao-seca",
      lifeStage: "adulto",
      size: "medio",
      brand: "golden",
    });
  });

  it("aceita etapas puladas", () => {
    expect(parseFunnelPath(["gatos", "castrado", "whiskas"], brands)).toEqual({
      species: "gatos",
      lifeStage: "castrado",
      brand: "whiskas",
    });
  });

  it("rejeita segmentos desconhecidos, repetidos, fora de ordem ou incompatíveis", () => {
    expect(parseFunnelPath(["caes", "xyz"], brands)).toBeNull();
    expect(parseFunnelPath(["caes", "adulto", "racao-seca"], brands)).toBeNull();
    expect(parseFunnelPath(["gatos", "medio"], brands)).toBeNull();
    expect(parseFunnelPath(["caes", "castrado"], brands)).toBeNull();
  });

  it("é o inverso de buildFunnelPath", () => {
    const path = "/caes/racao-seca/adulto/medio/premium/golden";
    expect(buildFunnelPath(parseFunnelPath(path.slice(1).split("/"), brands)!)).toBe(path);
  });
});

describe("parâmetros de filtro", () => {
  it("ida e volta pela query string", () => {
    const f = parseFilterParams({ filtros: "grain-free,xyz", embalagem: "3-10kg", loja: "amazon,petz", ordem: "total" });
    expect(f).toEqual({ refinements: ["grain-free"], packageRange: "3-10kg", storeSlugs: ["amazon", "petz"], sort: "total" });
    expect(buildFilterQuery(f)).toBe("?filtros=grain-free&embalagem=3-10kg&loja=amazon%2Cpetz&ordem=total");
  });
});

describe("currentStep", () => {
  it("avança para a etapa seguinte à última escolhida", () => {
    expect(currentStep({ species: "caes" }, undefined)).toBe("foodType");
    expect(currentStep({ species: "gatos", foodType: "racao-seca", lifeStage: "adulto" }, undefined)).toBe("segment");
    expect(currentStep({ species: "caes", foodType: "racao-seca", lifeStage: "adulto" }, undefined)).toBe("size");
  });

  it("respeita a etapa escolhida na query e o fim do funil", () => {
    expect(currentStep({ species: "caes" }, "fase")).toBe("lifeStage");
    expect(currentStep({ species: "caes" }, "fim")).toBeNull();
  });
});
