import Link from "next/link";
import { ArrowRight, BadgeCheck, Calculator, RefreshCcw, Scale } from "lucide-react";

import { Funnel } from "@/components/funnel/funnel";
import { ListingCard } from "@/components/offers/listing-card";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getBrands, getFunnelCounts, getTopDeals } from "@/lib/data";

export default async function HomePage() {
  const [counts, brands, dogDeals, catDeals] = await Promise.all([
    getFunnelCounts({}, "species"),
    getBrands(),
    getTopDeals({ species: "caes", foodType: "racao-seca" }, 4),
    getTopDeals({ species: "gatos", foodType: "racao-seca" }, 4),
  ]);

  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,var(--color-accent),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-8 sm:pt-16">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-bold text-primary shadow-xs">
            <RefreshCcw className="size-3.5" aria-hidden /> Preços verificados {siteConfig.checkIntervalLabel}
          </p>
          <h1 className="max-w-2xl text-4xl leading-[1.05] font-black sm:text-5xl">
            A ração do seu pet pelo <span className="text-primary">menor preço por kg</span>.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Escolha exatamente o que você compra e veja onde está mais barato hoje. A ordem é sempre honesta: o mais barato
            aparece primeiro.
          </p>
          <div className="mt-8 max-w-3xl">
            <Funnel selection={{}} step="species" counts={counts} brands={brands} filters={{}} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <DealsBlock title="Ração seca para cães" subtitle="Menor preço por kg hoje" href="/caes/racao-seca?etapa=fase" listings={dogDeals} />
        <DealsBlock title="Ração seca para gatos" subtitle="Menor preço por kg hoje" href="/gatos/racao-seca?etapa=fase" listings={catDeals} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">Como funciona</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Scale, title: "Preço por kg", text: "Comparamos embalagens de tamanhos diferentes pelo preço por kg (ou por 100 g, em sachês e petiscos)." },
            { icon: RefreshCcw, title: "Verificação automática", text: `Abrimos a página de cada oferta ${siteConfig.checkIntervalLabel}, e também às quintas, quando começam as ofertas de fim de semana.` },
            { icon: BadgeCheck, title: "Ordem honesta", text: "Nenhuma marca ou loja paga por posição. A comissão nunca muda a ordem da comparação." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border bg-card p-6">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="text-2xl font-extrabold">Quanto a ração custa por mês?</h2>
            <p className="mt-1 text-primary-foreground/85">Informe o peso do seu pet e descubra quantos dias o pacote dura.</p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link href="/calculadora">
              <Calculator /> Abrir calculadora
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function DealsBlock({
  title,
  subtitle,
  href,
  listings,
}: {
  title: string;
  subtitle: string;
  href: string;
  listings: Awaited<ReturnType<typeof getTopDeals>>;
}) {
  return (
    <div className="mb-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wide text-primary uppercase">{subtitle}</p>
          <h2 className="text-2xl font-extrabold">{title}</h2>
        </div>
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-primary hover:underline">
          Ver todas <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {listings.map((l, i) => (
          <ListingCard key={l.product.id} listing={l} rank={i} />
        ))}
      </div>
    </div>
  );
}
