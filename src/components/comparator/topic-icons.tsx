import { Barcode, CircleDot, Drumstick, HeartPulse, Leaf, Pill, Ruler, Soup, Stethoscope, Weight } from "lucide-react";

import { CatIcon, DogIcon } from "@/components/icons/species-icons";
import { DryFoodIcon } from "@/components/icons/food-icons";
import type { ProductTopic } from "@/lib/catalog/topics";
import type { ComparatorItem } from "@/lib/comparator/types";
import { cn } from "@/lib/utils";

function TopicIcon({ topic, item }: { topic: ProductTopic; item: Pick<ComparatorItem, "species" | "kind"> }) {
  const cls = "size-5";
  switch (topic.key) {
    case "para":
      return item.species === "gatos" ? <CatIcon size={20} /> : <DogIcon size={20} />;
    case "porte":
      return <Ruler className={cls} aria-hidden />;
    case "tipo":
      return item.kind === "umida" ? <Soup className={cls} aria-hidden /> : item.kind === "natural" ? <Leaf className={cls} aria-hidden /> : item.kind === "medicamentosa" ? <Pill className={cls} aria-hidden /> : <DryFoodIcon size={20} />;
    case "sabor":
      return <Drumstick className={cls} aria-hidden />;
    case "peso":
      return <Weight className={cls} aria-hidden />;
    case "indicacoes":
      return <HeartPulse className={cls} aria-hidden />;
    case "grao":
      return <CircleDot className={cls} aria-hidden />;
    case "veterinario":
      return <Stethoscope className={cls} aria-hidden />;
    case "gtin":
      return <Barcode className={cls} aria-hidden />;
  }
}

/** Ficha da embalagem em tópicos com ícone, para conferir com o pacote antes de comprar. */
export function TopicGrid({ topics, item, className }: { topics: ProductTopic[]; item: Pick<ComparatorItem, "species" | "kind">; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-3", className)}>
      {topics.map((t) => (
        <div key={t.key} className={cn("flex items-start gap-3", t.key === "veterinario" && "col-span-2")}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/80 sm:size-9">
            <TopicIcon topic={t} item={item} />
          </span>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{t.label}</dt>
            <dd className={cn("text-sm font-medium", !t.value && "font-normal text-muted-foreground")}>{t.value ?? "Não informado"}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
