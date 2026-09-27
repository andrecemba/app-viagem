import type { ComparatorBrand } from "@/lib/comparator/types";
import { cn } from "@/lib/utils";

/** Texto escuro sobre cores claras (amarelos), branco nas demais. */
export function textColorFor(hex: string) {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.3 ? "#1a1a1a" : "#fff";
}

/**
 * Identidade provisória da marca: monograma na cor predominante da marca.
 * Será trocado pelo logotipo oficial quando ele for cadastrado.
 */
export function BrandSwatch({ brand, size = 28, className }: { brand: ComparatorBrand; size?: number; className?: string }) {
  if (brand.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logotipo local, tamanho fixo
      <img src={brand.logo} alt="" width={size} height={size} className={cn("shrink-0 rounded-[5px] bg-white object-contain", className)} />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[5px] font-display font-bold", className)}
      style={{ width: size, height: size, backgroundColor: brand.color, color: textColorFor(brand.color), fontSize: size * 0.38, letterSpacing: "-0.02em" }}
    >
      {brand.initials}
    </span>
  );
}
