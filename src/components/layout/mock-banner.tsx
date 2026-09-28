import { getDb } from "@/lib/db";

/** Aviso enquanto houver ofertas de exemplo no banco (some quando os exemplos são removidos). */
export function DemoDataBanner() {
  const hasDemo = Boolean(getDb().prepare("SELECT 1 FROM offers WHERE is_demo = 1 AND active = 1 LIMIT 1").get());
  if (!hasDemo) return null;
  return (
    <div className="border-b bg-muted">
      <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Versão de demonstração.</span> Preços marcados como “Exemplo” são fictícios e não levam a uma loja.
      </p>
    </div>
  );
}
