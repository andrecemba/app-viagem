import type { Metadata } from "next";

import { InstitutionalPage } from "@/components/layout/institutional-page";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata: Metadata = { title: "Perguntas frequentes" };

const faqs = [
  {
    id: "preco-diferente",
    q: "Por que o preço pode ser diferente no site da loja?",
    a: `Atualizamos os preços a cada 48 horas nas lojas com integração, e mostramos em cada oferta quando o preço foi obtido. Entre uma verificação e outra a loja pode mudar o preço, acabar o estoque ou aplicar um frete diferente para o seu CEP. Promoções relâmpago e preços de vendedores parceiros também mudam rápido. O preço válido é sempre o da loja no momento da compra.`,
  },
  {
    id: "comissao",
    q: "Vocês ganham comissão? Isso muda a ordem?",
    a: "Podemos receber comissão quando você compra por um link nosso, sem custo extra para você. A ordem não muda: o mais barato por kg vem primeiro. Só em empates de até 1% a oferta com comissão aparece antes.",
  },
  {
    id: "preco-por-kg",
    q: "Como é calculado o preço por kg?",
    a: "Dividimos o preço pelo peso líquido da embalagem. Em sachês, latas e petiscos usamos o preço por 100 g e também mostramos o preço por unidade.",
  },
  {
    id: "pix-assinatura",
    q: "O que são os selos Pix e Assinatura?",
    a: "Algumas lojas dão desconto no Pix ou na compra programada (assinatura). Mostramos esses valores como selos, mas a comparação usa o preço padrão, que vale para todos.",
  },
  {
    id: "loja-nao-aparece",
    q: "Minha loja favorita não aparece. Podem incluir?",
    a: "Sim! Envie a sugestão pela página de contato. Priorizamos lojas com dados de preço confiáveis e atualizados.",
  },
  {
    id: "dietas",
    q: "Posso comprar dietas veterinárias por aqui?",
    a: "Mostramos os preços, mas dietas veterinárias devem ser usadas sob orientação do médico-veterinário.",
  },
];

export default function FaqPage() {
  return (
    <InstitutionalPage title="Perguntas frequentes">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }),
        }}
      />
      <Accordion type="single" collapsible defaultValue="preco-diferente" className="rounded-2xl border bg-card px-5">
        {faqs.map((f) => (
          <AccordionItem key={f.id} value={f.id} id={f.id} className="scroll-mt-28">
            <AccordionTrigger>{f.q}</AccordionTrigger>
            <AccordionContent>{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </InstitutionalPage>
  );
}
