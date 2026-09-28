export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

/** Preço-alvo opcional: "189,90" ou "189.90"; precisa ser menor que o preço atual. */
export function parseTargetPrice(raw: unknown, current: number | null): number | null | "invalido" {
  if (raw == null || raw === "") return null;
  const text = String(raw).trim();
  const n = Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
  if (!Number.isFinite(n) || n <= 0) return "invalido";
  if (current != null && n >= current) return "invalido";
  return Math.round(n * 100) / 100;
}
