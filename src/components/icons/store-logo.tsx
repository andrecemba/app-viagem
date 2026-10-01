import { textColorFor } from "@/components/comparator/brand-swatch";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 1)).toUpperCase();
}

/**
 * Selo pequeno da loja: o logotipo cadastrado (arquivo autorizado) ou as
 * iniciais na cor da loja — nunca um logotipo copiado sem autorização.
 */
export function StoreLogo({ name, color, logo, size = 28, className }: { name: string; color: string; logo?: string | null; size?: number; className?: string }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element -- logotipo cadastrado pelo admin, tamanho fixo
    return <img src={logo} alt="" width={size} height={size} className={cn("shrink-0 rounded-md bg-white object-contain", className)} />;
  }
  const text = initials(name);
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md font-display font-bold", className)}
      style={{ width: size, height: size, backgroundColor: color, color: textColorFor(color), fontSize: size * (text.length > 1 ? 0.36 : 0.46) }}
    >
      {text}
    </span>
  );
}
