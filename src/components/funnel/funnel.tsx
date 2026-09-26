import Link from "next/link";
import { LayoutGrid, Stethoscope, X } from "lucide-react";

import { BrandMark } from "@/components/icons/brand-mark";
import { FunnelIcon } from "@/components/icons/funnel-icon";
import {
  FOOD_TYPES,
  LIFE_STAGES,
  SEGMENTS,
  SIZES,
  SPECIES,
  VET_DIET_WARNING,
  type FunnelOption,
} from "@/config/taxonomy";
import {
  funnelSteps,
  nextStepAfter,
  STEP_LABEL,
  type FunnelDimension,
  type FunnelSelection,
} from "@/lib/funnel/filters";
import { cn } from "@/lib/utils";
import type { Brand } from "@/types/catalog";

import { funnelHref, type QueryFilters } from "./funnel-href";
import { OptionTile } from "./option-tile";

const QUESTIONS: Record<FunnelDimension, string> = {
  species: "Para quem é?",
  foodType: "Qual tipo de alimento?",
  lifeStage: "Qual a fase de vida?",
  size: "Qual o porte?",
  segment: "Qual faixa de ração?",
  brand: "Tem marca preferida?",
};



function optionsFor(dim: Exclude<FunnelDimension, "brand">, selection: FunnelSelection): FunnelOption<string>[] {
  switch (dim) {
    case "species":
      return SPECIES;
    case "foodType":
      return FOOD_TYPES;
    case "lifeStage":
      return LIFE_STAGES.filter((o) => !selection.species || o.species.includes(selection.species));
    case "size":
      return SIZES;
    case "segment":
      return SEGMENTS;
  }
}

function valueLabel(dim: FunnelDimension, slug: string, brands: Brand[]) {
  if (dim === "brand") return brands.find((b) => b.slug === slug)?.name ?? slug;
  const opt = optionsFor(dim, {}).find((o) => o.slug === slug);
  return opt?.shortLabel ?? opt?.label ?? slug;
}

export function Funnel({
  selection,
  step,
  counts,
  brands,
  filters,
}: {
  selection: FunnelSelection;
  step: FunnelDimension | null;
  counts: Record<string, number>;
  brands: Brand[];
  filters: QueryFilters;
}) {
  const steps = funnelSteps(selection);
  const stepIndex = step ? steps.indexOf(step) : steps.length;

  return (
    <section aria-labelledby="funil-titulo" className="space-y-5">
      {/* Trilha: etapas escolhidas (clicáveis para trocar), puladas ("Todas") e futuras. */}
      <ol className="flex flex-wrap items-center gap-2" aria-label="Etapas do funil">
        {steps.map((dim, i) => {
          const value = selection[dim];
          const isCurrent = dim === step;
          if (value) {
            const without = { ...selection, [dim]: undefined };
            if (dim === "species") {
              return (
                <li key={dim}>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                  >
                    {valueLabel(dim, value, brands)}
                    <X className="size-3.5" aria-label="Trocar espécie" />
                  </Link>
                </li>
              );
            }
            return (
              <li key={dim}>
                <Link
                  href={funnelHref(without, filters, dim)}
                  scroll={false}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/15"
                  title={`Trocar ${STEP_LABEL[dim].toLowerCase()}`}
                >
                  <span className="font-semibold text-primary/70">{STEP_LABEL[dim]}:</span>
                  {valueLabel(dim, value, brands)}
                  <X className="size-3.5" aria-hidden />
                </Link>
              </li>
            );
          }
          if (i < stepIndex) {
            return (
              <li key={dim}>
                <Link
                  href={funnelHref(selection, filters, dim)}
                  scroll={false}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40"
                >
                  {STEP_LABEL[dim]}: Todas
                </Link>
              </li>
            );
          }
          return (
            <li
              key={dim}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                isCurrent ? "bg-foreground text-background" : "border border-dashed text-muted-foreground",
              )}
            >
              {i + 1}. {STEP_LABEL[dim]}
            </li>
          );
        })}
      </ol>

      {selection.foodType === "dietas-veterinarias" && <VetWarning />}

      {step && (
        <div className="rounded-3xl border bg-secondary/50 p-4 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="funil-titulo" className="text-xl font-extrabold sm:text-2xl">
              {QUESTIONS[step]}
            </h2>
            <span className="text-xs font-semibold text-muted-foreground">
              Etapa {stepIndex + 1} de {steps.length}
            </span>
          </div>
          {step === "brand" ? (
            <BrandGrid selection={selection} counts={counts} brands={brands} filters={filters} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {optionsFor(step, selection).map((opt) => {
                const count = counts[opt.slug] ?? 0;
                return (
                  <OptionTile
                    key={opt.slug}
                    href={count ? funnelHref({ ...selection, [step]: opt.slug }, filters) : null}
                    icon={<FunnelIcon icon={opt.icon} size={30} />}
                    label={opt.label}
                    description={opt.description}
                    count={count}
                  />
                );
              })}
              {step !== "species" && (
                <OptionTile
                  href={funnelHref(selection, filters, nextStepAfter(selection, step) ?? "fim")}
                  icon={<LayoutGrid className="size-7" aria-hidden />}
                  label="Todas"
                  description="Pular esta etapa"
                  count={counts.__all ?? 0}
                />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BrandGrid({
  selection,
  counts,
  brands,
  filters,
}: {
  selection: FunnelSelection;
  counts: Record<string, number>;
  brands: Brand[];
  filters: QueryFilters;
}) {
  const withOffers = brands.filter((b) => counts[b.slug]).sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0));
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <Link
        href={funnelHref(selection, filters, "fim")}
        scroll={false}
        className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <LayoutGrid className="size-6" aria-hidden />
        </span>
        <span className="text-xs font-bold">Todas</span>
        <span className="text-[11px] text-muted-foreground">{counts.__all ?? 0} ofertas</span>
      </Link>
      {withOffers.map((brand) => (
        <Link
          key={brand.slug}
          href={funnelHref({ ...selection, brand: brand.slug }, filters)}
          scroll={false}
          className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
        >
          <BrandMark brand={brand} size={48} />
          <span className="line-clamp-2 text-xs leading-tight font-bold">{brand.name}</span>
          <span className="text-[11px] text-muted-foreground">{counts[brand.slug]} ofertas</span>
        </Link>
      ))}
    </div>
  );
}

export function VetWarning({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-2xl bg-warning-soft p-4 text-sm font-semibold text-warning-foreground", className)}>
      <Stethoscope className="mt-0.5 size-4 shrink-0" aria-hidden />
      Dietas veterinárias: {VET_DIET_WARNING.toLowerCase()}
    </p>
  );
}
