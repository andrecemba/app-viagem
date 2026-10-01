"use client";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center" role="alert">
      <h1 className="font-display text-2xl font-bold">Não foi possível carregar os preços agora</h1>
      <p className="mt-2 text-muted-foreground">Pode ser uma instabilidade momentânea. Nenhum preço foi alterado.</p>
      <button type="button" onClick={reset} className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
        Tentar de novo
      </button>
    </div>
  );
}
