import { cn } from "@/lib/utils";

/**
 * Gráficos simples em HTML (uma cor só, valores escritos ao lado):
 * leitura direta, sem depender de cor, e funcionam no tema claro e escuro.
 */

export function BarList({
  rows,
  valueLabel,
  empty = "Sem dados no período.",
  max: maxRows = 10,
}: {
  rows: { key: string; label: React.ReactNode; value: number; detail?: React.ReactNode }[];
  valueLabel: string;
  empty?: string;
  max?: number;
}) {
  const shown = rows.filter((r) => r.value > 0).slice(0, maxRows);
  if (!shown.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...shown.map((r) => r.value));
  return (
    <ol className="space-y-2.5">
      {shown.map((r, i) => (
        <li key={r.key} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">
              <span className="mr-1.5 text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
              {r.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {r.value.toLocaleString("pt-BR")} <span className="text-xs font-normal text-muted-foreground">{valueLabel}</span>
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted" aria-hidden>
            <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
          {r.detail && <p className="mt-0.5 text-xs text-muted-foreground">{r.detail}</p>}
        </li>
      ))}
    </ol>
  );
}

const dayLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

/** Colunas por dia com dica ao passar o mouse; tabela equivalente para leitores de tela. */
export function DailyColumns({ data, label }: { data: { date: string; clicks: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.clicks));
  const ticks = [0, Math.floor((data.length - 1) / 2), data.length - 1];
  return (
    <figure>
      <div className="flex gap-3">
        <div className="flex h-40 flex-col justify-between py-0.5 text-right text-[0.6875rem] text-muted-foreground tabular-nums" aria-hidden>
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative flex h-40 min-w-0 flex-1 items-end gap-[2px] border-b border-l border-border/70" aria-hidden>
          {[0.5, 1].map((f) => (
            <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/60" style={{ bottom: `${f * 100}%` }} />
          ))}
          {data.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 items-end">
              <div className="w-full rounded-t-[3px] bg-brand transition-opacity group-hover:opacity-80" style={{ height: `${(d.clicks / max) * 100}%`, minHeight: d.clicks ? 2 : 0 }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded bg-foreground px-2 py-1 text-[0.6875rem] whitespace-nowrap text-background group-hover:block">
                {dayLabel(d.date)}: <strong>{d.clicks}</strong> {d.clicks === 1 ? "clique" : "cliques"}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between pl-9 text-[0.6875rem] text-muted-foreground tabular-nums" aria-hidden>
        {ticks.map((t, i) => (
          <span key={i}>{data[t] ? dayLabel(data[t].date) : ""}</span>
        ))}
      </div>
      <figcaption className="sr-only">{label}</figcaption>
      <details className="mt-2 text-xs [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none text-muted-foreground underline underline-offset-4">Ver tabela</summary>
        <table className="mt-2 w-full max-w-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="font-medium">Dia</th>
              <th className="text-right font-medium">Cliques</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <td>{dayLabel(d.date)}</td>
                <td className="text-right tabular-nums">{d.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function Stat({ label, value, detail, className }: { label: string; value: React.ReactNode; detail?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
