"use client";

import { ProductCard } from "@/components/comparator/product-card";
import type { ComparatorItem } from "@/lib/comparator/types";

/** Prévia do cartão do site público, com o mesmo componente usado lá. */
export function PublicPreview({ item }: { item: ComparatorItem }) {
  return (
    <div className="pointer-events-none select-none" aria-label="Prévia do cartão no site público">
      <ProductCard item={item} onOpen={() => {}} />
    </div>
  );
}
