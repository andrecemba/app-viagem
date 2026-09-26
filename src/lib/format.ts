const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number) {
  return brl.format(value);
}

export function formatWeight(grams: number) {
  if (grams >= 1000) return `${(grams / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
  return `${grams.toLocaleString("pt-BR")} g`;
}

export function formatPercent(rate: number, digits = 0) {
  return `${(rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;
}

export function formatRelativeHours(iso: string, now: Date) {
  const hours = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 3600_000));
  if (hours < 1) return "há menos de 1 hora";
  if (hours < 24) return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.round(hours / 24);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

export function formatShortDate(isoDate: string) {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}
