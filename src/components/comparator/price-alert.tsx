"use client";

import { useId, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { BellRing, Check, X } from "lucide-react";

import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Botão chamativo (âmbar) — o mesmo visual na página do produto e no Top descontos. */
export const alertButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-4 font-semibold text-neutral-950 shadow-sm ring-1 ring-amber-500/60 transition-colors hover:bg-amber-300 focus-visible:ring-[3px] focus-visible:ring-amber-500/60 focus-visible:outline-none";

/**
 * "Avisar oferta": a pessoa deixa o e-mail e recebe um aviso quando o preço
 * cair (ou chegar a um valor). Sem produto = avisos do Top descontos.
 */
export function PriceAlertButton({
  product,
  sendingActive,
  className,
  label = "Avisar oferta",
}: {
  product?: { id: string; name: string; bestPrice: number | null };
  sendingActive: boolean;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"qualquer" | "alvo">("qualquer");
  const [state, setState] = useState<{ status: "idle" | "sending" | "done"; error?: string; email?: string }>({ status: "idle" });
  const id = useId();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/avisos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          produto: product?.id ?? null,
          precoAlvo: mode === "alvo" ? fd.get("precoAlvo") : null,
          consentimento: fd.get("consentimento") === "on",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { erro?: string };
      if (!res.ok) setState({ status: "idle", error: data.erro ?? "Não foi possível registrar. Tente de novo." });
      else setState({ status: "done", email });
    } catch {
      setState({ status: "idle", error: "Sem conexão. Tente de novo." });
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setState({ status: "idle" });
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className={cn(alertButtonClass, "h-10 text-sm", className)}>
          <BellRing className="size-4" aria-hidden /> {label}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl border bg-background p-5 shadow-xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="flex items-center gap-2 font-display text-lg font-bold">
                <span className="flex size-8 items-center justify-center rounded-full bg-amber-400 text-neutral-950">
                  <BellRing className="size-4" aria-hidden />
                </span>
                {product ? "Avisar quando baixar" : "Avisar ofertas do dia"}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm text-muted-foreground">
                {product ? (
                  <>
                    {product.name}
                    {product.bestPrice != null && (
                      <>
                        {" "}· hoje a partir de <strong className="text-foreground">{formatBRL(product.bestPrice)}</strong>
                      </>
                    )}
                  </>
                ) : (
                  "Receba por e-mail as rações que estiverem mais baratas que a média."
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fechar">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          {state.status === "done" ? (
            <div className="mt-5 rounded-lg bg-success-soft p-4 text-sm" role="status">
              <p className="flex items-center gap-2 font-semibold text-success">
                <Check className="size-4" aria-hidden /> Pedido registrado
              </p>
              <p className="mt-1">
                Vamos avisar em <strong>{state.email}</strong>.
              </p>
              {!sendingActive && (
                <p className="mt-2 text-muted-foreground">Nesta versão de demonstração o envio de e-mails ainda não está ligado; o pedido fica guardado.</p>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Seu e-mail</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="voce@email.com"
                  className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus:border-foreground focus:ring-[3px] focus:ring-ring/20"
                />
              </label>

              {product && product.bestPrice != null && (
                <fieldset className="space-y-2 text-sm">
                  <legend className="mb-1.5 font-medium">Quando avisar</legend>
                  <label className="flex items-center gap-2">
                    <input type="radio" name={`${id}-modo`} checked={mode === "qualquer"} onChange={() => setMode("qualquer")} className="accent-foreground" />
                    Em qualquer queda de preço
                  </label>
                  <label className="flex flex-wrap items-center gap-2">
                    <input type="radio" name={`${id}-modo`} checked={mode === "alvo"} onChange={() => setMode("alvo")} className="accent-foreground" />
                    Quando chegar a
                    <span className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground">R$</span>
                      <input
                        name="precoAlvo"
                        inputMode="decimal"
                        placeholder={String(Math.floor(product.bestPrice * 0.9)).concat(",00")}
                        onFocus={() => setMode("alvo")}
                        aria-label="Preço desejado"
                        className="h-9 w-32 rounded-md border border-input bg-card pr-2 pl-9 outline-none focus:border-foreground"
                      />
                    </span>
                  </label>
                </fieldset>
              )}

              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="consentimento" required className="mt-0.5 size-4 shrink-0 accent-foreground" />
                <span>
                  Autorizo o envio de avisos de preço para este e-mail. Posso cancelar a qualquer momento. Detalhes na{" "}
                  <Link href="/privacidade" target="_blank" className="underline underline-offset-2">
                    Política de Privacidade
                  </Link>
                  .
                </span>
              </label>

              {state.error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-100" role="alert">
                  {state.error}
                </p>
              )}
              <button type="submit" disabled={state.status === "sending"} className={cn(alertButtonClass, "h-11 w-full text-base disabled:opacity-60")}>
                <BellRing className="size-4" aria-hidden /> {state.status === "sending" ? "Enviando…" : "Quero ser avisado"}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
