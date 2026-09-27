import { siteConfig } from "@/config/site";

export function MockDataBanner() {
  if (!siteConfig.isMockData) return null;
  return (
    <div className="border-b bg-muted">
      <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Versão de demonstração.</span> Produtos e lojas de exemplo, preços
        ilustrativos e sem links de compra ativos.
      </p>
    </div>
  );
}
