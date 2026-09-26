import { FlaskConical } from "lucide-react";

import { siteConfig } from "@/config/site";

export function MockDataBanner() {
  if (!siteConfig.isMockData) return null;
  return (
    <div className="bg-warning-soft text-warning-foreground">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-semibold">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        Dados de exemplo — preços, lojas e percentuais são fictícios.
      </p>
    </div>
  );
}
