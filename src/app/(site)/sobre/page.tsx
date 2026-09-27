import type { Metadata } from "next";
import Link from "next/link";

import { InstitutionalPage } from "@/components/layout/institutional-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Sobre / Como funciona" };

export default function AboutPage() {
  return (
    <InstitutionalPage
      title="Sobre / Como funciona"
      intro={`O ${siteConfig.name} mostra onde a ração que você já compra está mais barata hoje, comparando pelo preço por kg.`}
    >
      <h2>Por que preço por kg?</h2>
      <p>
        Um pacote de 15 kg e outro de 3 kg não podem ser comparados pelo preço total. Por isso dividimos o preço pelo peso: ração
        seca em <strong>R$/kg</strong>; sachês, latas e petiscos em <strong>R$/100 g</strong> (e por unidade).
      </p>
      <h2>Como escolher o produto</h2>
      <p>
        No funil você escolhe espécie, tipo de alimento, fase de vida, porte, faixa e marca. Pode pular qualquer etapa
        (&quot;Todas&quot;) e voltar quando quiser. O endereço da página guarda a sua escolha, então dá para salvar ou compartilhar.
      </p>
      <h2>De onde vêm os preços</h2>
      <p>
        Abrimos automaticamente a página de cada oferta {siteConfig.checkIntervalLabel}, com uma verificação extra às quintas-feiras.
        Usamos APIs oficiais e dados estruturados das próprias lojas, respeitando os termos de uso de cada site. Ofertas suspeitas
        (preço fora do normal, avaria, validade próxima) passam por revisão humana antes de aparecer.
      </p>
      <h2>Como o site se sustenta</h2>
      <p>
        Com links de afiliado: quando você compra por um link nosso, a loja pode nos pagar uma comissão, sem custo extra para você.
        A ordem da comparação nunca muda por isso. Veja os detalhes em{" "}
        <Link href="/divulgacao-de-afiliados">Divulgação de afiliados</Link>.
      </p>
    </InstitutionalPage>
  );
}
