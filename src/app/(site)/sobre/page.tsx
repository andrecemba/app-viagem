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
      <h2>A mesma ração, sempre</h2>
      <p>
        Cada ração é identificada por espécie, marca, linha, indicação, sabor e peso. Outro peso, outro sabor ou a versão para
        castrados são produtos diferentes e nunca entram na mesma comparação. Cada oferta mostra o peso e o sabor do anúncio para você
        conferir; anúncios com dúvida passam por revisão antes de aparecer.
      </p>
      <h2>De onde vêm os preços</h2>
      <p>
        Usamos só fontes permitidas: APIs oficiais das lojas (quando a nossa conta tem acesso), arquivos autorizados e cadastro
        manual pela nossa equipe. Não copiamos páginas das lojas. Cada preço mostra quando foi obtido; depois de 48 horas sem
        atualização, ele aparece como desatualizado. O frete só é mostrado para o seu CEP quando a loja cota o valor.
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
