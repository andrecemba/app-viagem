/** "há 3 h", "há 2 dias" — texto relativo curto em português. */
export function timeAgo(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "sem data";
  const h = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 3600_000);
  if (h < 1) return "há menos de 1 h";
  if (h < 48) return `há ${Math.round(h)} h`;
  return `há ${Math.round(h / 24)} dias`;
}

export function formatDateTimeBr(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function formatDateBr(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}
