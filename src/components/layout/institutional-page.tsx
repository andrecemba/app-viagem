import { FileWarning } from "lucide-react";

export function InstitutionalPage({
  title,
  intro,
  draft,
  children,
}: {
  title: string;
  intro?: string;
  /** Mostra o aviso de texto provisório (páginas legais). */
  draft?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-lg text-muted-foreground">{intro}</p>}
      {draft && (
        <p className="mt-6 flex items-start gap-2 rounded-2xl bg-warning-soft p-4 text-sm font-semibold text-warning-foreground">
          <FileWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
          Texto provisório. Revisar com assessoria jurídica antes de publicar.
        </p>
      )}
      <div className="prose-content mt-8 space-y-5 leading-relaxed">{children}</div>
    </div>
  );
}
