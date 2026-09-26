import Image from "next/image";

import type { Brand } from "@/types/catalog";
import { cn } from "@/lib/utils";

/** Logo da marca, ou placeholder (círculo com iniciais e cor) até o admin enviar o oficial. */
export function BrandMark({ brand, size = 48, className }: { brand: Pick<Brand, "name" | "initials" | "color" | "logoUrl">; size?: number; className?: string }) {
  if (brand.logoUrl) {
    return (
      <Image
        src={brand.logoUrl}
        alt={brand.name}
        width={size}
        height={size}
        className={cn("rounded-full bg-white object-contain", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold text-white shadow-sm", className)}
      style={{ width: size, height: size, backgroundColor: brand.color, fontSize: size * 0.36 }}
    >
      {brand.initials}
    </span>
  );
}
