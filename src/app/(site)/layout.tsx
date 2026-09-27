import { MockDataBanner } from "@/components/layout/mock-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { RelatedDrawerProvider } from "@/components/offers/related-drawer";

/** Estrutura do site público (comparador). A área administrativa usa outro layout em /admin. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <RelatedDrawerProvider>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <MockDataBanner />
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </RelatedDrawerProvider>
  );
}
