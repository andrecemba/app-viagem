import { siteConfig } from "@/config/site";
import { catalogSource } from "@/lib/data";

export function MockDataBanner() {
  // Com o catálogo do admin (CATALOGO_PUBLICO=admin), preços e links são os cadastrados: sem aviso de exemplo.
  if (!siteConfig.isMockData || catalogSource() === "admin") return null;
  return (
    <div className="border-b bg-muted">
      <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Versão de demonstração.</span> Produtos e lojas de exemplo, preços
        ilustrativos e sem links de compra ativos.
      </p>
    </div>
  );
}
