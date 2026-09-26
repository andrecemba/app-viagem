"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarDays, Cat, Dog, Wallet } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatWeight } from "@/lib/format";
import type { CalculatorProduct } from "@/lib/data/types";
import { gramsPerDayFor, monthlyCost } from "@/lib/pricing/feeding";
import { cn } from "@/lib/utils";
import type { SpeciesSlug } from "@/types/catalog";

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 md:text-sm";

export function FeedingCalculator({ products, initialSlug }: { products: CalculatorProduct[]; initialSlug?: string }) {
  const initial = products.find((p) => p.slug === initialSlug);
  const [species, setSpecies] = useState<SpeciesSlug>(initial?.species ?? "caes");
  const [slug, setSlug] = useState(initial?.slug ?? products.find((p) => p.species === (initial?.species ?? "caes"))?.slug ?? "");
  const [weight, setWeight] = useState(species === "caes" ? "12" : "4");
  const [manualGrams, setManualGrams] = useState("");

  const options = products.filter((p) => p.species === species);
  const product = products.find((p) => p.slug === slug);
  const petWeight = Number(weight.replace(",", "."));
  const tableGrams = product?.feedingTable ? gramsPerDayFor(product.feedingTable, petWeight) : null;
  const gramsPerDay = product?.feedingTable ? tableGrams : Number(manualGrams.replace(",", ".")) || null;

  const result = useMemo(
    () => (product && gramsPerDay ? monthlyCost(product.bestPrice, product.netWeightGrams, gramsPerDay) : null),
    [product, gramsPerDay],
  );

  function changeSpecies(next: SpeciesSlug) {
    setSpecies(next);
    setSlug(products.find((p) => p.species === next)?.slug ?? "");
    setWeight(next === "caes" ? "12" : "4");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form className="space-y-5 rounded-3xl border bg-card p-5 sm:p-6" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Seu pet é</legend>
          <div className="grid grid-cols-2 gap-3">
            {([["caes", "Cão", Dog], ["gatos", "Gato", Cat]] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={species === value}
                onClick={() => changeSpecies(value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border p-4 font-display font-bold transition",
                  species === value ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "hover:border-primary/40",
                )}
              >
                <Icon className="size-6" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="calc-produto">Ração</Label>
          <select id="calc-produto" className={selectClass} value={slug} onChange={(e) => setSlug(e.target.value)}>
            {options.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          {product && (
            <p className="text-xs text-muted-foreground">
              Menor preço hoje: <strong className="text-foreground">{formatBRL(product.bestPrice)}</strong> {product.storePreposition} {product.storeName} ·{" "}
              <Link href={`/produto/${product.slug}`} className="font-semibold text-primary hover:underline">comparar lojas</Link>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="calc-peso">Peso do pet (kg)</Label>
          <Input id="calc-peso" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ex.: 12" />
        </div>

        {product && !product.feedingTable && (
          <div className="space-y-2 rounded-2xl bg-warning-soft p-4">
            <Label htmlFor="calc-gramas" className="text-warning-foreground">Quantidade diária indicada na embalagem (g/dia)</Label>
            <p className="text-xs text-warning-foreground">
              Ainda não temos a tabela de consumo desta ração. Consulte a embalagem e informe a quantidade para o peso do seu pet.
            </p>
            <Input id="calc-gramas" inputMode="decimal" value={manualGrams} onChange={(e) => setManualGrams(e.target.value)} placeholder="Ex.: 220" />
          </div>
        )}
      </form>

      <div className="space-y-4" aria-live="polite">
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<CalendarDays className="size-5" aria-hidden />} label="O pacote dura" value={result ? `${Math.floor(result.daysPerPackage)} dias` : "—"} />
          <Stat icon={<Wallet className="size-5" aria-hidden />} label="Custo por mês" value={result ? formatBRL(result.monthlyCost) : "—"} highlight />
        </div>
        <div className="rounded-2xl border bg-card p-5 text-sm">
          {result && product && gramsPerDay ? (
            <ul className="space-y-2">
              <li className="flex justify-between gap-3"><span className="text-muted-foreground">Quantidade diária</span><strong>{gramsPerDay} g/dia{product.feedingTable && " (tabela da embalagem)"}</strong></li>
              <li className="flex justify-between gap-3"><span className="text-muted-foreground">Embalagem</span><strong>{formatWeight(product.netWeightGrams)}</strong></li>
              <li className="flex justify-between gap-3"><span className="text-muted-foreground">Pacotes por mês</span><strong>{result.packagesPerMonth.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</strong></li>
              <li className="flex justify-between gap-3"><span className="text-muted-foreground">Custo por dia</span><strong>{formatBRL(result.monthlyCost / 30)}</strong></li>
            </ul>
          ) : (
            <p className="text-muted-foreground">Preencha os campos para ver o resultado.</p>
          )}
        </div>
        <p className="flex items-start gap-2 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          A quantidade ideal deve seguir a embalagem e a orientação do veterinário.
        </p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-5", highlight ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
      <span className={cn("mb-3 flex size-9 items-center justify-center rounded-xl", highlight ? "bg-primary-foreground/15" : "bg-accent text-accent-foreground")}>
        {icon}
      </span>
      <p className={cn("text-xs font-semibold", highlight ? "text-primary-foreground/85" : "text-muted-foreground")}>{label}</p>
      <p className="font-display text-2xl font-black">{value}</p>
    </div>
  );
}
