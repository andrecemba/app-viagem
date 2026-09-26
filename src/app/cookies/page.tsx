import type { Metadata } from "next";

import { InstitutionalPage } from "@/components/layout/institutional-page";

export const metadata: Metadata = { title: "Política de Cookies" };

export default function CookiesPage() {
  return (
    <InstitutionalPage title="Política de Cookies" draft>
      <h2>Cookies necessários</h2>
      <p>Usados para lembrar sua preferência de tema (claro/escuro) e o funcionamento básico do site. Não identificam você.</p>
      <h2>Cookies de medição e de terceiros</h2>
      <p>Não usamos rastreamento de terceiros sem o seu consentimento. Se forem adotados, você poderá aceitar ou recusar em um aviso de cookies.</p>
      <h2>Cookies das lojas</h2>
      <p>Ao clicar em uma oferta, a loja ou o programa de afiliados pode definir cookies próprios para atribuir a compra. Eles seguem a política de cada loja.</p>
    </InstitutionalPage>
  );
}
