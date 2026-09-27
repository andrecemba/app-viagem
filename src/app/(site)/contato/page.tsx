import type { Metadata } from "next";

import { ContactForm } from "@/components/forms/contact-form";
import { InstitutionalPage } from "@/components/layout/institutional-page";

export const metadata: Metadata = { title: "Contato" };

export default function ContactPage() {
  return (
    <InstitutionalPage title="Contato" intro="Achou um preço errado, quer sugerir uma loja ou falar de parcerias? Escreva para nós.">
      <ContactForm />
    </InstitutionalPage>
  );
}
