import type { HistoryEvent } from "@/lib/admin/types";

import { DemoBadge, EmptyState, formatDateTime, Tag } from "./ui";

const TYPE_LABEL: Record<HistoryEvent["type"], string> = {
  criacao: "Criação",
  edicao_manual: "Edição manual",
  importacao: "Importação",
  preco: "Preço",
  verificacao: "Verificação",
  trava: "Trava",
  status: "Estado",
  alerta: "Alerta",
  vinculo: "Vínculo",
};

const RESULT: Record<HistoryEvent["result"], { label: string; tone: "good" | "bad" | "warn" | "neutral" }> = {
  ok: { label: "OK", tone: "good" },
  falha: { label: "Falha", tone: "bad" },
  pendente: { label: "Aguardando revisão", tone: "warn" },
  ignorado: { label: "Não executado", tone: "neutral" },
};

function show(v: unknown) {
  if (v == null || v === "") return "vazio";
  if (typeof v === "number") return v.toLocaleString("pt-BR");
  return String(v);
}

export function HistoryList({ events, labelFor }: { events: HistoryEvent[]; labelFor?: (e: HistoryEvent) => string | null }) {
  if (!events.length) return <EmptyState title="Sem histórico ainda." />;
  return (
    <ol className="divide-y rounded-md border text-sm">
      {events.map((e) => (
        <li key={e.id} className="grid gap-1 px-3 py-2 sm:grid-cols-[9.5rem_1fr]">
          <div className="text-xs text-muted-foreground tabular-nums">{formatDateTime(e.at)}</div>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium">{TYPE_LABEL[e.type]}</span>
              <Tag tone={RESULT[e.result].tone}>{RESULT[e.result].label}</Tag>
              {e.demo && <DemoBadge />}
              <span className="text-xs text-muted-foreground">por {e.actor}</span>
            </p>
            <p className="text-muted-foreground">{e.message}</p>
            {e.field && e.from !== e.to && e.type !== "verificacao" && (
              <p className="text-xs">
                <span className="text-muted-foreground">{e.field}:</span> <span className="line-through decoration-muted-foreground/60">{show(e.from)}</span> →{" "}
                <span className="font-medium">{show(e.to)}</span>
              </p>
            )}
            {labelFor?.(e) && <p className="text-xs text-muted-foreground">{labelFor(e)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
