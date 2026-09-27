import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";

import { MockDataBanner } from "@/components/layout/mock-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { RelatedDrawerProvider } from "@/components/offers/related-drawer";
import { siteConfig } from "@/config/site";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — ${siteConfig.tagline}`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131417" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${montserrat.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
