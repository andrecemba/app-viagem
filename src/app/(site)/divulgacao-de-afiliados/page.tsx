import type { Metadata } from "next";

import { InstitutionalPage } from "@/components/layout/institutional-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Divulgação de afiliados" };

export default function AffiliateDisclosurePage() {
  return (
    <InstitutionalPage title="Divulgação de afiliados" intro={siteConfig.affiliateDisclaimer}>
      <h2>Quais programas usamos</h2>
      <p>
        Participamos (ou pretendemos participar) de programas de afiliados como Amazon Associados, Mercado Livre Afiliados, Shopee
        Afiliados, Parceiro Petz e redes como a Awin. Algumas lojas da comparação não têm programa: elas aparecem do mesmo jeito,
        com link comum.
      </p>
      <h2>A comparação de preços não considera a comissão</h2>
      <ul>
        <li>As ofertas são sempre ordenadas pelo <strong>menor preço por kg</strong> (ou por 100 g), com ou sem comissão.</li>
        <li>
          Só em caso de empate (diferença de até 1% no preço por kg) a oferta com link de afiliado aparece primeiro.
        </li>
        <li>Nenhuma marca ou loja paga para aparecer em uma posição melhor.</li>
      </ul>
      <h2>As sugestões &quot;Compre junto&quot; consideram a comissão</h2>
      <p>
        Na seção &quot;Compre junto&quot;, no painel &quot;Aproveite e leve também&quot; e no &quot;Kit do mês&quot;, primeiro
        filtramos só itens <strong>relevantes para o seu pet</strong> (mesma espécie, fase de vida compatível, em estoque). Entre
        esses, damos preferência aos itens da mesma loja e aos que geram mais comissão. Nunca sugerimos um item irrelevante só
        porque paga mais.
      </p>
      <h2>Como funcionam os links</h2>
      <p>
        Todo link de saída passa por um endereço nosso (/ir/…), que registra o clique sem dados pessoais e redireciona para a loja.
        Isso nos permite corrigir links sem republicar o site.
      </p>
    </InstitutionalPage>
  );
}
