import type { Metadata } from "next";
import Link from "next/link";

import { ImportForm } from "@/components/admin/import-form";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Importar planilha" };

export default async function ImportPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Importar planilha"
        description={
          <>
            Cada linha é uma ração e um anúncio. Produtos que já existem são reaproveitados; anúncios já cadastrados não são duplicados.{" "}
            <Link href="/admin/produtos" className="underline underline-offset-4">
              Voltar
            </Link>
          </>
        }
      />
      <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
        <p>
          <a href="/modelo-importacao.csv" download className="font-medium underline underline-offset-4">
            Baixar o modelo (.csv)
          </a>{" "}
          e abrir no Excel ou no Google Planilhas. Pode enviar o arquivo <strong>.xlsx</strong> direto (no Google Planilhas: Arquivo → Fazer
          download → Microsoft Excel) ou salvar como <strong>.csv</strong>. Só a primeira aba é lida.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Obrigatórias para criar o produto: <strong>especie</strong> (Cachorro ou Gato), <strong>marca</strong>, <strong>indicacao</strong>, <strong>peso</strong> (ex.:
            2,5 kg) e <strong>link_anuncio</strong>.
          </li>
          <li>
            Com a API da loja ligada (Lojas), preço, disponibilidade, frete grátis, peso, sabor e foto vêm do anúncio oficial. Sem ela, use as colunas preco,
            disponivel e frete_gratis.
          </li>
          <li>O que ficar vazio aparece como “Pendente de verificação”. Não preencha nada que não conferiu no anúncio.</li>
          <li>
            <strong>link_afiliado</strong>: o link gerado no programa de afiliados (ex.: meli.la/…). Ele nunca é montado a partir do link do anúncio.
          </li>
        </ul>
      </div>
      <ImportForm />
    </div>
  );
}
