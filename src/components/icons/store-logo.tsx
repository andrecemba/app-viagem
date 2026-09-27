import { textColorFor } from "@/components/comparator/brand-swatch";
import { storeInfo } from "@/config/stores";
import { cn } from "@/lib/utils";

/**
 * Selo pequeno da loja: logotipo autorizado quando existir em `public/lojas/`,
 * senão as iniciais na cor da loja.
 */
export function StoreLogo({ slug, size = 28, className }: { slug: string; size?: number; className?: string }) {
  const store = storeInfo(slug);
  if (store.logo) {
    // eslint-disable-next-line @next/next/no-img-element -- logotipo local, tamanho fixo
    return <img src={store.logo} alt="" width={size} height={size} className={cn("shrink-0 rounded-md bg-white object-contain", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md font-display font-bold", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: store.color,
        color: textColorFor(store.color),
        fontSize: size * (store.initials.length > 1 ? 0.36 : 0.46),
        letterSpacing: "-0.02em",
      }}
    >
      {store.initials}
    </span>
  );
}
