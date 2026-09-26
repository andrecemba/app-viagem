import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  title = "Nenhuma oferta encontrada",
  description = "Tente remover algum filtro ou voltar uma etapa do funil.",
  resetHref,
}: {
  title?: string;
  description?: string;
  resetHref?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <SearchX className="size-7" aria-hidden />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {resetHref && (
        <Button asChild variant="outline" className="mt-5">
          <Link href={resetHref}>Limpar filtros</Link>
        </Button>
      )}
    </div>
  );
}
