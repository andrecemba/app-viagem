import { Comparator } from "@/components/comparator/comparator";
import { PopularBrands } from "@/components/comparator/popular-brands";
import { RecentlyViewed } from "@/components/comparator/recently-viewed";
import { TopDeals } from "@/components/comparator/top-deals";
import { PetsEatingIllustration } from "@/components/illustrations/pets-eating";
import { getTopDeals } from "@/lib/analytics/top-deals";
import { getCatalog, staleHours } from "@/lib/catalog/public";
import { readUrlState } from "@/lib/comparator/filters";
import type { ComparatorBrand } from "@/lib/comparator/types";
import { formatWeight } from "@/lib/format";
import { alertSendingActive } from "@/lib/price-alerts/store";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [items, params] = await Promise.all([getCatalog(), searchParams]);
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.brand.slug, (counts.get(i.brand.slug) ?? 0) + 1);
  const brands = [...new Map<string, ComparatorBrand>(items.map((i) => [i.brand.slug, i.brand])).values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const popular = [...brands]
    .map((b) => ({ ...b, count: counts.get(b.slug) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, 10);
  const top = getTopDeals(items);
  const hours = staleHours();

  return (
    <>
      <Comparator
        key={JSON.stringify(params)}
        items={items}
        brands={brands}
        initial={readUrlState(params)}
        aside={
          <div className="space-y-4">
            <PetsEatingIllustration className="mx-auto hidden max-w-[22rem] lg:block" />
            <TopDeals deals={top.deals} basedOnDemand={top.basedOnDemand} sendingActive={alertSendingActive()} />
          </div>
        }
        strip={
          <>
            <PopularBrands brands={popular} />
            <RecentlyViewed
              candidates={items.map((i) => ({ slug: i.slug, name: [i.title, i.flavor].filter(Boolean).join(" · "), weight: formatWeight(i.netWeightGrams), price: i.bestPrice }))}
            />
          </>
        }
        intro={
          <>
            <PetsEatingIllustration className="mb-4 max-w-[15rem] sm:max-w-[18rem] lg:hidden" />
            <p className="text-sm font-medium text-muted-foreground">Comparador de preços de ração</p>
            <h1 className="mt-3 max-w-3xl font-display text-[1.75rem] leading-[1.15] font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              Encontre a ração que você já compra pelo menor preço.
            </h1>
            <p className="mt-4 hidden max-w-2xl text-base leading-relaxed text-muted-foreground sm:block sm:text-lg">
              Mesma marca, sabor e peso em várias lojas, com preço por kg e o horário de cada atualização.
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
            { title: "A mesma embalagem", text: "Marca, linha, indicação, sabor e peso idênticos. Um pacote de 3 kg nunca é comparado com um de 15 kg, nem a versão para castrados com a comum." },
            { title: "Preço com horário", text: `Cada preço mostra quando foi consultado. Depois de ${hours} horas sem atualização, ele aparece como desatualizado.` },
            { title: "Frete só quando cotado", text: "O preço mostrado é do produto. Frete grátis “para o seu CEP” só aparece quando uma cotação da loja confirma." },
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
