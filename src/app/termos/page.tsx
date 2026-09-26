import type { Metadata } from "next";

import { InstitutionalPage } from "@/components/layout/institutional-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <InstitutionalPage title="Termos de uso" draft>
      <h2>1. O serviço</h2>
      <p>O {siteConfig.name} é um comparador de preços. Não vendemos produtos: as compras são feitas diretamente nas lojas.</p>
      <h2>2. Preços e disponibilidade</h2>
      <p>Os preços são verificados periodicamente e podem mudar. O preço válido é o da loja no momento da compra.</p>
      <h2>3. Links de afiliado</h2>
      <p>O site contém links de afiliado. Podemos receber comissão por compras, sem custo extra para você.</p>
      <h2>4. Responsabilidade</h2>
      <p>Não nos responsabilizamos por entrega, troca, garantia ou atendimento das lojas. Informações nutricionais não substituem a orientação do médico-veterinário.</p>
      <h2>5. Contato</h2>
      <p>Dúvidas sobre estes termos podem ser enviadas pela página de contato.</p>
    </InstitutionalPage>
  );
}
