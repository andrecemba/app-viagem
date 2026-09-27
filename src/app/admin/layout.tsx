import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Administração", template: "%s · Administração Ração Certa" },
  robots: { index: false, follow: false },
};

/** Área administrativa: sem o cabeçalho e o rodapé do site público. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-dvh flex-col bg-background">{children}</div>;
}
