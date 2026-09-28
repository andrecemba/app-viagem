import { Comparator } from "@/components/comparator/comparator";
import { TopDeals } from "@/components/comparator/top-deals";
import { PetsEatingIllustration } from "@/components/illustrations/pets-eating";
import { alertSendingActive } from "@/lib/price-alerts/store";
import { getTopDeals } from "@/lib/analytics/top-deals";
import { MOCK_NOW } from "@/data/mock/random";
import { REGION_LABEL } from "@/config/comparator";
import { readUrlState } from "@/lib/comparator/filters";
import type { ComparatorBrand } from "@/lib/comparator/types";
import { catalogSource, getCatalog } from "@/lib/data";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [items, params] = await Promise.all([getCatalog(), searchParams]);
  const brands = [...new Map<string, ComparatorBrand>(items.map((i) => [i.brand.slug, i.brand])).values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const demo = catalogSource() === "exemplo";
  const top = await getTopDeals(items, demo ? MOCK_NOW : new Date());

  return (
    <>
      <Comparator
        items={items}
        brands={brands}
        initial={readUrlState(params)}
        aside={
          <div className="space-y-4">
            <PetsEatingIllustration className="mx-auto hidden max-w-[22rem] lg:block" />
            <TopDeals deals={top.deals} basedOnDemand={top.basedOnDemand} sendingActive={alertSendingActive()} />
          </div>
        }
        intro={
          <>
            <PetsEatingIllustration className="mb-4 max-w-[15rem] sm:max-w-[18rem] lg:hidden" />
            <p className="text-sm font-medium text-muted-foreground">Comparador de rações · {REGION_LABEL}</p>
            <h1 className="mt-3 max-w-3xl font-display text-[1.75rem] leading-[1.15] font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              Encontre a ração que você já compra e compare o preço entre lojas.
            </h1>
            <p className="mt-4 hidden max-w-2xl text-base leading-relaxed text-muted-foreground sm:block sm:text-lg">
              Digite a marca ou escolha para quem é a ração e refine pela lateral. O preço é sempre da mesma embalagem, com o valor por kg e a comparação com a média dos últimos 30 dias.
            </p>
          </>
        }
      />

      <section aria-labelledby="como-comparamos" className="mx-auto mt-20 max-w-6xl border-t px-4 pt-10">
        <h2 id="como-comparamos" className="font-display text-lg font-semibold">
          Como comparamos
        </h2>
        <dl className="mt-6 grid gap-8 text-sm sm:grid-cols-3">
          {[
            {
              title: "A mesma embalagem",
              text: "Fórmula, sabor e peso idênticos. Um pacote de 3 kg nunca é comparado com um de 15 kg.",
            },
            {
              title: "Menor preço primeiro",
              text: "As lojas aparecem da oferta mais barata para a mais cara. Nenhuma loja paga por posição.",
            },
            demo
              ? {
                  title: "Demonstração",
                  text: "Nesta versão, produtos, lojas e preços são ilustrativos e não há links de compra ativos.",
                }
              : {
                  title: "Preço normal ou promoção",
                  text: "Comparamos o menor preço de hoje com a média dos últimos 30 dias: até 5% de diferença é preço normal.",
                },
          ].map((b) => (
            <div key={b.title}>
              <dt className="font-semibold">{b.title}</dt>
              <dd className="mt-1.5 leading-relaxed text-muted-foreground">{b.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
