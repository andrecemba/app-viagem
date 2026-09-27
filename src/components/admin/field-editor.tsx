import { displayedOrigin, sameValue } from "@/lib/admin/fields";
import type { FieldState } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

import { btn, formatDateTime, input, Tag, VerificationBadge } from "./ui";

export type InputSpec =
  | { kind: "text"; placeholder?: string }
  | { kind: "url" }
  | { kind: "number"; suffix?: string; step?: string }
  | { kind: "textarea" }
  | { kind: "select"; options: { value: string; label: string }[] };

/**
 * Linha de um campo editável: valor exibido, origem, leitura automática,
 * correção manual, trava, data de revisão e valor automático pendente (diferença).
 * Formulários simples (sem JavaScript): editar abre um <details>.
 */
export function FieldEditor<T extends string | number>({
  id,
  label,
  field,
  spec,
  format = (v) => String(v),
  editAction,
  commandAction,
  hidden,
  showVerification = true,
  allowVerify = false,
  sensitive = false,
}: {
  id: string;
  label: string;
  field: FieldState<T>;
  spec: InputSpec;
  format?: (v: T) => React.ReactNode;
  editAction: (fd: FormData) => Promise<void>;
  commandAction: (fd: FormData) => Promise<void>;
  hidden: Record<string, string>;
  showVerification?: boolean;
  allowVerify?: boolean;
  sensitive?: boolean;
}) {
  const hiddenInputs = Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  const value = field.value;
  const reviewDue = field.reviewAt && new Date(field.reviewAt) <= new Date();

  return (
    <div id={id} className="scroll-mt-20 py-3">
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr]">
        <div className="text-sm font-medium">
          {label}
          {sensitive && <p className="text-[0.6875rem] font-normal text-muted-foreground">Mudança automática exige revisão</p>}
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className={cn("text-sm", value == null && "text-muted-foreground italic")}>
              {value == null || value === "" ? "Vazio" : format(value as T)}
            </span>
            {showVerification && <VerificationBadge verification={field.verification} compact />}
            {field.locked && <Tag>Travado</Tag>}
            {field.reviewAt && <Tag tone={reviewDue ? "warn" : "neutral"}>Revisar em {new Date(field.reviewAt).toLocaleDateString("pt-BR")}</Tag>}
          </div>
          <p className="text-xs text-muted-foreground">
            Origem: {displayedOrigin(field as FieldState<unknown>)}
            {field.auto && sameValue(field.auto.value, value) && <>, {formatDateTime(field.auto.at)}</>}
            {field.auto && !sameValue(field.auto.value, value) && (
              <>
                {" "}· último valor automático: {field.auto.value == null ? "vazio" : format(field.auto.value as T)} ({field.auto.source},{" "}
                {formatDateTime(field.auto.at)})
              </>
            )}
            {field.manual && (
              <>
                {" "}· correção manual por {field.manual.by} em {formatDateTime(field.manual.at)}
                {field.manual.note && ` (“${field.manual.note}”)`}
              </>
            )}
          </p>

          {field.pendingAuto && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-sm dark:border-amber-800 dark:bg-amber-950">
              <p className="font-medium">Novo valor automático aguardando revisão</p>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-xs">
                <dt className="text-muted-foreground">Exibido agora</dt>
                <dd className="font-medium">{value == null ? "vazio" : format(value as T)}</dd>
                <dt className="text-muted-foreground">Recebido</dt>
                <dd className="font-medium">{field.pendingAuto.value == null ? "vazio" : format(field.pendingAuto.value as T)}</dd>
                <dt className="text-muted-foreground">Origem</dt>
                <dd>
                  {field.pendingAuto.source}, {formatDateTime(field.pendingAuto.at)}
                </dd>
              </dl>
              {spec.kind === "url" && field.pendingAuto.value && value && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[value, field.pendingAuto.value].map((src, i) => (
                    <figure key={i} className="text-center text-[0.6875rem] text-muted-foreground">
                      {/* eslint-disable-next-line @next/next/no-img-element -- prévia de URL arbitrária informada pelo admin */}
                      <img src={String(src)} alt="" className="mx-auto h-24 w-full rounded border bg-card object-contain" />
                      <figcaption>{i === 0 ? "Atual" : "Recebida"}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={commandAction}>
                  {hiddenInputs}
                  <input type="hidden" name="comando" value="accept_auto" />
                  <button type="submit" className={btn.secondary}>
                    Aceitar novo valor
                  </button>
                </form>
                <form action={commandAction}>
                  {hiddenInputs}
                  <input type="hidden" name="comando" value="lock" />
                  <button type="submit" className={btn.ghost}>
                    Manter o atual (travado)
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <details className="group w-full [&_summary::-webkit-details-marker]:hidden">
              <summary className="inline-flex cursor-pointer list-none text-xs font-medium underline underline-offset-4">Corrigir</summary>
              <form action={editAction} className="mt-2 space-y-2 rounded-md border p-3">
                {hiddenInputs}
                <label className="block space-y-1 text-xs">
                  <span className="font-medium">Novo valor (vazio = limpar)</span>
                  {spec.kind === "select" ? (
                    <select name="valor" defaultValue={value == null ? "" : String(value)} className={input}>
                      <option value="">— Não informado —</option>
                      {spec.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : spec.kind === "textarea" ? (
                    <textarea name="valor" defaultValue={value == null ? "" : String(value)} rows={4} className={input + " h-auto py-1.5"} />
                  ) : (
                    <input
                      name="valor"
                      type={spec.kind === "url" ? "url" : "text"}
                      inputMode={spec.kind === "number" ? "decimal" : undefined}
                      defaultValue={value == null ? "" : String(value)}
                      placeholder={spec.kind === "text" ? spec.placeholder : spec.kind === "url" ? "https://" : undefined}
                      className={input}
                    />
                  )}
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <label className="inline-flex items-center gap-1.5">
                    <input type="checkbox" name="travar" defaultChecked className="accent-foreground" /> Travar (importações não sobrescrevem)
                  </label>
                  {allowVerify && (
                    <label className="inline-flex items-center gap-1.5">
                      <input type="checkbox" name="verificado" className="accent-foreground" /> Conferi na embalagem ou no fabricante
                    </label>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block space-y-1 text-xs">
                    <span className="font-medium">Revisar em (opcional)</span>
                    <input type="date" name="revisarEm" defaultValue={field.reviewAt?.slice(0, 10) ?? ""} className={input} />
                  </label>
                  <label className="block space-y-1 text-xs">
                    <span className="font-medium">Nota (opcional)</span>
                    <input name="nota" className={input} placeholder="Ex.: conferido na embalagem" />
                  </label>
                </div>
                <button type="submit" className={btn.primary}>
                  Salvar correção
                </button>
              </form>
            </details>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {(field.locked || field.reviewAt) && (
              <form action={commandAction}>
                {hiddenInputs}
                <input type="hidden" name="comando" value={field.locked ? "unlock" : "clear_review"} />
                <button type="submit" className="font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  {field.locked ? "Remover trava" : "Remover data de revisão"}
                </button>
              </form>
            )}
            {!field.locked && field.manual && (
              <form action={commandAction}>
                {hiddenInputs}
                <input type="hidden" name="comando" value="lock" />
                <button type="submit" className="font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  Travar correção
                </button>
              </form>
            )}
            {field.manual && field.auto && !field.pendingAuto && (
              <form action={commandAction}>
                {hiddenInputs}
                <input type="hidden" name="comando" value="accept_auto" />
                <button type="submit" className="font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  Voltar ao valor automático
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
