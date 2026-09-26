"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { formatBRL, formatShortDate } from "@/lib/format";
import type { StoreHistory } from "@/lib/data/types";
import { cn } from "@/lib/utils";

type Row = { date: string } & Record<string, number | string>;

function HistoryTooltip({ active, payload, label, stores }: TooltipContentProps<number, string> & { stores: StoreHistory[] }) {
  if (!active || !payload?.length) return null;
  const rows = [...payload].filter((p) => typeof p.value === "number").sort((a, b) => Number(a.value) - Number(b.value));
  return (
    <div className="min-w-44 rounded-xl border bg-popover p-3 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-muted-foreground">{formatShortDate(String(label))}</p>
      <ul className="space-y-1">
        {rows.map((p) => {
          const store = stores.find((s) => s.storeId === p.dataKey);
          return (
            <li key={String(p.dataKey)} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: store?.color }} />
                {store?.storeName}
              </span>
              <strong className="text-foreground">{formatBRL(Number(p.value))}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Histórico de 60 dias (um ponto por verificação), uma linha por loja. */
export function PriceHistoryChart({ history }: { history: StoreHistory[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [showTable, setShowTable] = useState(false);

  const data = useMemo(() => {
    const byDate = new Map<string, Row>();
    for (const s of history) {
      for (const p of s.points) {
        const row = byDate.get(p.date) ?? { date: p.date };
        row[s.storeId] = p.price;
        byDate.set(p.date, row);
      }
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [history]);

  if (!data.length) return null;

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-2" aria-label="Lojas no gráfico">
        {history.map((s) => {
          const off = hidden.includes(s.storeId);
          return (
            <li key={s.storeId}>
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => setHidden((h) => (off ? h.filter((x) => x !== s.storeId) : [...h, s.storeId]))}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                  off ? "text-muted-foreground opacity-60" : "bg-card",
                )}
              >
                <span aria-hidden className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.storeName}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="h-64 w-full sm:h-72" role="img" aria-label="Gráfico do histórico de preço dos últimos 60 dias por loja">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              minTickGap={24}
            />
            <YAxis
              width={64}
              tickFormatter={(v: number) => formatBRL(v).replace(",00", "")}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-muted-foreground)", strokeWidth: 1 }}
              content={(props) => <HistoryTooltip {...(props as TooltipContentProps<number, string>)} stores={history} />}
            />
            {history.map((s) =>
              hidden.includes(s.storeId) ? null : (
                <Line
                  key={s.storeId}
                  type="monotone"
                  dataKey={s.storeId}
                  name={s.storeName}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
                  isAnimationActive={false}
                  connectNulls
                />
              ),
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <button type="button" onClick={() => setShowTable((v) => !v)} className="mt-2 text-xs font-bold text-primary hover:underline">
        {showTable ? "Ocultar tabela" : "Ver como tabela"}
      </button>
      {showTable && (
        <div className="mt-2 max-h-64 overflow-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                {history.map((s) => (
                  <th key={s.storeId} className="px-3 py-2 text-right">
                    {s.storeName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((row) => (
                <tr key={row.date} className="border-t">
                  <td className="px-3 py-1.5">{formatShortDate(row.date)}</td>
                  {history.map((s) => (
                    <td key={s.storeId} className="px-3 py-1.5 text-right tabular-nums">
                      {typeof row[s.storeId] === "number" ? formatBRL(row[s.storeId] as number) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
