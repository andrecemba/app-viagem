import type { Store } from "@/types/catalog";
import { cn } from "@/lib/utils";

export function StoreMark({ store, className }: { store: Pick<Store, "name" | "color">; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold", className)}>
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: store.color }} />
      {store.name}
    </span>
  );
}
