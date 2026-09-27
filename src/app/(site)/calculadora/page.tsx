import type { Metadata } from "next";

import { FeedingCalculator } from "@/components/calculator/feeding-calculator";
import { getCalculatorProducts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Calculadora de gasto mensal com ração",
  description: "Descubra quantos dias o pacote de ração dura e quanto você gasta por mês, pelo peso do seu pet.",
};

export default async function CalculatorPage({ searchParams }: PageProps<"/calculadora">) {
  const { produto } = await searchParams;
  const products = await getCalculatorProducts();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-black sm:text-4xl">Calculadora de gasto mensal</h1>
      <p className="mt-2 mb-8 max-w-2xl text-muted-foreground">
        Usamos a tabela de consumo diário da embalagem (cadastrada por nós) e o menor preço de hoje para estimar quanto dura o
        pacote e o custo por mês.
      </p>
      <FeedingCalculator products={products} initialSlug={Array.isArray(produto) ? produto[0] : produto} />
    </div>
  );
}
