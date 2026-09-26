/** PRNG determinístico: os dados de exemplo são sempre iguais entre renders e builds. */
export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: string) {
  let a = hashString(seed);
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    chance: (p: number) => next() < p,
    pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    code: (length: number) =>
      Array.from({ length }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(next() * 32)]).join(""),
  };
}

/** "Hoje" fixo dos dados de exemplo, para evitar divergência entre servidor e cliente. */
export const MOCK_NOW = new Date("2026-09-26T12:00:00-03:00");
