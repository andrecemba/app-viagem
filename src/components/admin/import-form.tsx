"use client";

import Link from "next/link";
import { useActionState } from "react";

import { importCatalogAction, type ImportState } from "@/app/admin/actions";
import type { ImportStatus } from "@/lib/domain/catalog-import";

import { btn, input } from "./ui";

const STATUS: Record<ImportStatus, { label: string; cls: string }> = {
  importado: { label: "Importado", cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
  pendente: { label: "Pendente de verificação", cls: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  ja_existia: { label: "Já cadastrado", cls: "bg-muted text-muted-foreground" },
  erro: { label: "Erro", cls: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" },
};

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importCatalogAction, {});
  const results = state.results ?? [];
  const count = (s: ImportStatus) => results.filter((r) => r.status === s).length;

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3 rounded-lg border p-4">
        <label className="block text-sm font-semibold" htmlFor="arquivo">
          Arquivo .csv
        </label>
        <input id="arquivo" name="arquivo" type="file" accept=".csv,text/csv,text/plain" className={input + " h-auto py-1.5"} />
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Ou cole o conteúdo da planilha</summary>
          <textarea name="texto" rows={5} className={input + " mt-2 h-auto py-2 font-mono text-xs"} placeholder="especie;marca;linha;indicacao;sabor;peso;..." />
        </details>
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "Importando…" : "Importar"}
        </button>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      </form>

      {results.length > 0 && (
        <div className="rounded-lg border">
          <p className="border-b p-3 text-sm">
            <strong>{results.length}</strong> linha(s): {count("importado")} importada(s), {count("pendente")} pendente(s) de verificação, {count("ja_existia")} já
            cadastrada(s), {count("erro")} com erro.
          </p>
          <ul className="divide-y">
            {results.map((r) => (
              <li key={r.line} className="space-y-1 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Linha {r.line}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                  <span className="font-medium">{r.label}</span>
                </div>
                {r.pending.length > 0 && (
                  <p className="text-amber-800 dark:text-amber-300">Pendente de verificação: {r.pending.join(", ")}. Confira no anúncio e preencha.</p>
                )}
                {r.messages.map((m) => (
                  <p key={m} className="text-muted-foreground">
                    {m}
                  </p>
                ))}
                <div className="flex gap-3">
                  {r.productId && (
                    <Link href={`/admin/produtos/${r.productId}`} className="underline underline-offset-4">
                      Abrir produto
                    </Link>
                  )}
                  {r.offerId && (
                    <Link href={`/admin/ofertas/${r.offerId}`} className="underline underline-offset-4">
                      Abrir oferta
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
