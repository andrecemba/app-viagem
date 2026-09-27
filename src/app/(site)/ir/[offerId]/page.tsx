import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Bug, Info } from "lucide-react";

import { StoreMark } from "@/components/icons/store-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getOutboundTarget } from "@/lib/data";
import { formatBRL, formatPercent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Redirecionando para a loja",
  robots: { index: false, follow: false },
};

const SOURCE_LABEL = {
  api: "1 · Link gerado pela API oficial do programa",
  manual: "2 · Link de afiliado cadastrado pelo admin",
  rule: "3 · Link construído por regra (tag / deeplink)",
  plain: "4 · Link comum (sem afiliado)",
} as const;

/**
 * SIMULAÇÃO da Fase 0. Na Fase 1 esta rota vira um Route Handler que registra o
 * clique (sem dados pessoais), resolve a URL pela cadeia de afiliado e responde 302.
 */
export default async function OutboundPage({ params }: PageProps<"/ir/[offerId]">) {
  const { offerId } = await params;
  const target = await getOutboundTarget(decodeURIComponent(offerId));
  if (!target) notFound();
  const isDev = process.env.NODE_ENV !== "production";
  const linksEnabled = siteConfig.outboundLinksEnabled;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-sm font-semibold text-muted-foreground">
        {linksEnabled ? "Você será redirecionado para" : "Oferta ilustrativa em"}
      </p>
      <h1 className="mt-2 flex justify-center text-3xl font-black">
        <StoreMark store={target.store} />
      </h1>
      <p className="mt-3 text-muted-foreground">
        {target.productName} · <strong className="text-foreground">{formatBRL(target.price)}</strong> na última verificação
      </p>
      {linksEnabled ? (
        <Button asChild size="lg" className="mt-8">
          <a href={target.affiliate.url} rel="sponsored nofollow noopener">
            Continuar para a loja <ArrowRight />
          </a>
        </Button>
      ) : (
        <>
          <Button size="lg" variant="outline" className="mt-8" disabled>
            Link da loja em breve
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">
            Nesta demonstração os preços são ilustrativos e ainda não há links de compra ativos.
          </p>
        </>
      )}
      <p className="mx-auto mt-6 flex max-w-md items-start gap-2 text-left text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {siteConfig.affiliateDisclaimer}
      </p>

      {isDev && (
        <div className="mt-10 rounded-2xl border border-dashed bg-card p-5 text-left text-sm">
          <p className="mb-3 flex items-center gap-2 font-bold">
            <Bug className="size-4 text-primary" aria-hidden /> Modo de desenvolvimento — o que aconteceria em produção
          </p>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">Origem do link</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                {SOURCE_LABEL[target.affiliate.source]}
                <Badge variant={target.affiliate.affiliateStatus === "ok" ? "success" : "warning"}>
                  affiliate_status = {target.affiliate.affiliateStatus}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">URL de afiliado (redirect 302)</dt>
              <dd className="mt-0.5 rounded-lg bg-muted p-2 font-mono text-xs break-all">{target.affiliate.url}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">Comissão cadastrada (fictícia)</dt>
              <dd className="mt-0.5">{target.commissionRate ? formatPercent(target.commissionRate, 1) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">Registro do clique</dt>
              <dd className="mt-0.5">offer_id={target.offerId}, loja, data/hora — sem dados pessoais.</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Os links de exemplo apontam para produtos fictícios.{" "}
            <Link href="/divulgacao-de-afiliados" className="font-semibold text-primary hover:underline">Como funcionam os links</Link>
          </p>
        </div>
      )}
    </div>
  );
}
