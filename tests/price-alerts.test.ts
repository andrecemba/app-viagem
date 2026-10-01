import { describe, expect, it } from "vitest";

import { normalizeEmail, parseTargetPrice } from "@/lib/price-alerts/validate";

describe("Avisar oferta", () => {
  it("valida e normaliza o e-mail", () => {
    expect(normalizeEmail("  Ana@Email.com ")).toBe("ana@email.com");
    expect(normalizeEmail("ana@email")).toBeNull();
    expect(normalizeEmail("sem arroba")).toBeNull();
    expect(normalizeEmail(123)).toBeNull();
  });

  it("preço desejado precisa ser menor que o atual", () => {
    expect(parseTargetPrice("", 100)).toBeNull();
    expect(parseTargetPrice("89,90", 100)).toBe(89.9);
    expect(parseTargetPrice("1.089,90", 2000)).toBe(1089.9);
    expect(parseTargetPrice("120", 100)).toBe("invalido");
    expect(parseTargetPrice("abc", 100)).toBe("invalido");
  });
});
