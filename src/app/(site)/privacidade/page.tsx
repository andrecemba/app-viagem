import type { Metadata } from "next";

import { InstitutionalPage } from "@/components/layout/institutional-page";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacyPage() {
  return (
    <InstitutionalPage title="Política de Privacidade" intro="Como tratamos dados pessoais, conforme a LGPD (Lei 13.709/2018)." draft>
      <h2>Dados que coletamos</h2>
      <ul>
        <li><strong>Uso do site:</strong> termos buscados, filtros escolhidos, rações visitadas e cliques em “Ir à loja” (oferta, loja, preço e data/hora). Não guardamos IP, cookie nem identificação do visitante, e descartamos buscas que pareçam conter e-mail, telefone ou documento.</li>
        <li><strong>Formulário de contato:</strong> nome, e-mail e mensagem, apenas para responder você.</li>
        <li><strong>Cookies:</strong> apenas os necessários; outros só com o seu consentimento (veja a Política de Cookies).</li>
      </ul>
      <h2>Finalidade e base legal</h2>
      <p>Operar o comparador, responder contatos e medir o desempenho dos links, com base no legítimo interesse e no consentimento, quando aplicável.</p>
      <h2>Compartilhamento</h2>
      <p>Não vendemos dados. Ao clicar em uma oferta, você passa a estar sujeito à política de privacidade da loja.</p>
      <h2>Seus direitos</h2>
      <p>Você pode pedir acesso, correção ou exclusão dos seus dados pela página de contato.</p>
      <h2>Encarregado (DPO)</h2>
      <p>A definir.</p>
    </InstitutionalPage>
  );
}
