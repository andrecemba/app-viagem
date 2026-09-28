"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Info, MapPin, Truck } from "lucide-react";

import { StoreLogo } from "@/components/icons/store-logo";
import { formatGrams } from "@/lib/catalog/vocab";
import { unitPriceOf } from "@/lib/comparator/filters";
import type { ComparatorItem, ComparatorOffer } from "@/lib/comparator/types";
import { flavorMatches } from "@/lib/domain/validation";
import { formatBRL } from "@/lib/format";
import { formatDateBr, timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

import { DemoTag } from "./family-card";

type Quote = { status: "cotado"; cost: number; deadlineDays: number | null; quotedAt: string } | { status: "sem_cotacao"; reason: string };
type Sort = "menor-preco" | "preco-kg" | "recentes" | "preco-frete";

const CEP_KEY = "racao:cep";
/** Barra "Seu CEP (para o frete)": false = oculta. A cotação continua no código para religar. */
const SHOW_CEP = false;

const formatCep = (c: string) => `${c.slice(0, 5)}-${c.slice(5)}`;

/**
 * Ofertas de uma ração por loja. Três situações de frete, sempre separadas:
 * indicação geral do anúncio, frete cotado para o CEP (válido por poucas horas) e frete desconhecido.
 */
export function OfferList({ item, staleHours }: { item: ComparatorItem; staleHours: number }) {
  const [sort, setSort] = useState<Sort>("menor-preco");
  const [cepInput, setCepInput] = useState("");
  const [cep, setCep] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CEP lembrado só neste navegador: consulta de novo ao abrir a página.
  useEffect(() => {
    if (!SHOW_CEP) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(CEP_KEY);
    } catch {
      /* armazenamento indisponível */
    }
    if (saved && /^\d{8}$/.test(saved)) {
      const cepSaved = saved;
      queueMicrotask(() => {
        setCepInput(formatCep(cepSaved));
        void quote(cepSaved);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function quote(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return setError("Digite um CEP com 8 números.");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/frete?produto=${encodeURIComponent(item.slug)}&cep=${digits}`);
      const data = (await res.json()) as { quotes?: Record<string, Quote>; erro?: string };
      if (!res.ok || !data.quotes) throw new Error(data.erro ?? "Não foi possível consultar o frete.");
      setQuotes(data.quotes);
      setCep(digits);
      try {
        localStorage.setItem(CEP_KEY, digits);
      } catch {
        /* ignora */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível consultar o frete.");
    } finally {
      setLoading(false);
    }
  }

  const quoted = (o: ComparatorOffer) => (cep ? quotes[o.id] : undefined);
  const hasQuotes = item.offers.some((o) => quoted(o)?.status === "cotado");
  const effectiveSort: Sort = sort === "preco-frete" && !hasQuotes ? "menor-preco" : sort;

  const sorted = useMemo(() => {
    const priced = (o: ComparatorOffer) => o.inStock && o.price != null;
    const total = (o: ComparatorOffer) => {
      const q = quoted(o);
      return q?.status === "cotado" && o.price != null ? o.price + q.cost : null;
    };
    const key = (o: ComparatorOffer): number => {
      if (effectiveSort === "recentes") return -(o.priceObtainedAt ? new Date(o.priceObtainedAt).getTime() : 0);
      if (effectiveSort === "preco-kg") return unitPriceOf(item, o.price)?.value ?? 1e9;
      if (effectiveSort === "preco-frete") return total(o) ?? 1e9;
      return o.price ?? 1e9;
    };
    return [...item.offers].sort((a, b) => Number(priced(b)) - Number(priced(a)) || key(a) - key(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, effectiveSort, quotes, cep]);

  const best = sorted.find((o) => o.inStock && o.price != null);

  return (
    <div>
      <div className={`mb-3 flex flex-col gap-3 sm:flex-row sm:items-end ${SHOW_CEP ? "sm:justify-between" : "sm:justify-end"}`}>
        {SHOW_CEP && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void quote(cepInput);
            }}
          >
            <label className="space-y-1 text-sm">
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="size-4" aria-hidden /> Seu CEP (para o frete)
              </span>
              <input
                value={cepInput}
                onChange={(e) => setCepInput(e.target.value.replace(/[^\d-]/g, "").slice(0, 9))}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                className="h-10 w-36 rounded-md border border-input bg-card px-3 tabular-nums outline-none focus:border-foreground"
              />
            </label>
            <button type="submit" disabled={loading} className="h-10 rounded-md border bg-card px-3 text-sm font-medium hover:border-foreground/40 disabled:opacity-60">
              {loading ? "Consultando…" : "Consultar frete"}
            </button>
          </form>
        )}
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Ordenar por
          <select value={effectiveSort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-md border border-input bg-card px-2 text-foreground">
            <option value="menor-preco">Menor preço</option>
            <option value="preco-kg">Menor preço por kg</option>
            <option value="recentes">Atualização mais recente</option>
            {SHOW_CEP && (
              <option value="preco-frete" disabled={!hasQuotes}>
                Preço + frete{hasQuotes ? "" : " (precisa de cotação)"}
              </option>
            )}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {cep && !hasQuotes && (
        <p className="mb-3 flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Nenhuma loja cotou o frete para {formatCep(cep)} pela integração. Os preços abaixo são só do produto: confira o frete na loja antes de comprar.
        </p>
      )}

      <ol className="divide-y rounded-lg border">
        {sorted.map((o) => (
          <OfferRow key={o.id} o={o} item={item} q={quoted(o)} cep={cep} isBest={o === best} staleHours={staleHours} />
        ))}
      </ol>
    </div>
  );
}

function OfferRow({ o, item, q, cep, isBest, staleHours }: { o: ComparatorOffer; item: ComparatorItem; q?: Quote; cep: string | null; isBest: boolean; staleHours: number }) {
  const unit = unitPriceOf(item, o.price);
  const weightDiffers = o.listingWeightGrams != null && o.listingWeightGrams !== item.netWeightGrams;
  const flavorDiffers = !flavorMatches(item.flavor || null, o.listingFlavor);
  const available = o.inStock;
  return (
    <li className={cn("grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:gap-x-5 sm:p-4", !available && "opacity-60")}>
      <StoreLogo name={o.storeName} color={o.storeColor} logo={o.storeLogo} size={40} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
          {o.storeName}
          {isBest && <span className="rounded bg-success-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold text-success">Menor preço</span>}
          {o.isDemo && <DemoTag />}
        </p>
        <p className="text-xs text-muted-foreground">
          Anúncio: {o.listingWeightGrams ? formatGrams(o.listingWeightGrams) : "peso não informado"}
          {" · "}
          {o.listingFlavor ?? "sabor não informado"}
        </p>
        {(weightDiffers || flavorDiffers) && (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-warning-foreground">
            <AlertTriangle className="size-3.5" aria-hidden /> Confira: o anúncio indica {weightDiffers ? "outro peso" : "outro sabor"}.
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {o.availability === "indisponivel" ? "Indisponível na loja" : o.availability === "desconhecida" ? "Disponibilidade não informada" : "Disponível"}
        </p>
        <ShippingLine o={o} q={q} cep={cep} />
      </div>
      <div className="col-start-2 sm:col-start-auto sm:text-right">
        {o.price != null ? (
          <>
            {o.previousPrice != null && (
              <p className="text-xs text-muted-foreground tabular-nums">
                antes <s>{formatBRL(o.previousPrice)}</s> ({formatDateBr(o.previousPriceAt)})
              </p>
            )}
            <p className="font-display text-lg font-bold tabular-nums">{formatBRL(o.price)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{unit && `${formatBRL(unit.value)}${unit.label}`}</p>
            {q?.status === "cotado" && <p className="text-xs font-medium tabular-nums">Total com frete: {formatBRL(o.price + q.cost)}</p>}
            <p suppressHydrationWarning className={cn("text-xs", o.stale ? "font-medium text-warning-foreground" : "text-muted-foreground")}>
              {o.stale ? `Desatualizado (mais de ${staleHours} h) · ` : "Consultado "}
              {timeAgo(o.priceObtainedAt)}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Preço na loja</p>
            {o.priceHiddenReason && <p className="max-w-56 text-xs text-muted-foreground">{o.priceHiddenReason}</p>}
          </>
        )}
      </div>
      <div className="col-start-2 sm:col-start-auto">
        <a
          href={`/ir/${o.id}`}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          className={cn(
            "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md px-4 text-sm font-semibold transition-colors sm:w-auto",
            isBest ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border bg-card hover:border-foreground/40",
          )}
        >
          Ver oferta <ArrowUpRight className="size-4" aria-hidden />
          <span className="sr-only">em {o.storeName} (abre em nova aba)</span>
        </a>
      </div>
    </li>
  );
}

function ShippingLine({ o, q, cep }: { o: ComparatorOffer; q?: Quote; cep: string | null }) {
  if (q?.status === "cotado") {
    return (
      <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-success">
        <Truck className="size-3.5" aria-hidden />
        {q.cost === 0 ? `Frete grátis para ${formatCep(cep!)}` : `Frete para ${formatCep(cep!)}: ${formatBRL(q.cost)}`}
        {q.deadlineDays != null && ` · até ${q.deadlineDays} dias`}
      </p>
    );
  }
  if (o.freeShipping) {
    return (
      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
        <Truck className="size-3.5" aria-hidden /> O anúncio indica frete grátis (pode não valer para o seu CEP)
      </p>
    );
  }
  return <p className="mt-0.5 text-xs text-muted-foreground">{cep ? "Frete não cotado para o seu CEP" : "Frete: informe o CEP ou confira na loja"}</p>;
}
