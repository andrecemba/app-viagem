import { Comparator } from "@/components/comparator/comparator";
import { REGION_LABEL } from "@/config/comparator";
import { readUrlState } from "@/lib/comparator/filters";
import type { ComparatorBrand } from "@/lib/comparator/types";
import { getComparatorItems } from "@/lib/data";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [items, params] = await Promise.all([getComparatorItems(), searchParams]);
  const brands = [...new Map<string, ComparatorBrand>(items.map((i) => [i.brand.slug, i.brand])).values()];

  return (
    <>
      <Comparator
        items={items}
        brands={brands}
        initial={readUrlState(params)}
        intro={
          <>
            <p className="text-sm font-medium text-muted-foreground">Comparador de rações · {REGION_LABEL}</p>
            <h1 className="mt-3 max-w-3xl font-display text-[1.75rem] leading-[1.15] font-bold sm:text-[2.75rem] sm:leading-[1.1]">
              Encontre a ração que você já compra e compare o preço entre lojas.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Busque pela marca, linha, sabor ou peso. Cada tamanho de pacote aparece separado, para você comparar sempre a
              mesma embalagem.
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
            {
              title: "Demonstração",
              text: "Nesta versão, produtos, lojas e preços são ilustrativos e não há links de compra ativos.",
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
