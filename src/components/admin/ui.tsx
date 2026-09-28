import Link from "next/link";

import { cn } from "@/lib/utils";

/** Peças visuais compartilhadas pelas telas administrativas. */

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-4">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <div className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Flash({ aviso, erro }: { aviso?: string; erro?: string }) {
  if (!aviso && !erro) return null;
  return (
    <div className="space-y-2" role="status">
      {erro && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">{erro}</p>}
      {aviso && <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">{aviso}</p>}
    </div>
  );
}

const badgeBase = "inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-4";

export function DemoBadge() {
  return (
    <span className={cn(badgeBase, "bg-violet-100 text-violet-900 ring-1 ring-violet-300 dark:bg-violet-950 dark:text-violet-100 dark:ring-violet-800")} title="Dado fictício do modo de demonstração">
      DEMONSTRAÇÃO
    </span>
  );
}

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warn" | "bad" | "good" }) {
  const cls = {
    neutral: "bg-muted text-foreground/80 ring-1 ring-border",
    warn: "bg-amber-50 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-800",
    bad: "bg-red-50 text-red-900 ring-1 ring-red-300 dark:bg-red-950 dark:text-red-100 dark:ring-red-800",
    good: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-800",
  }[tone];
  return <span className={cn(badgeBase, cls)}>{children}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Section({ id, title, description, actions, children }: { id?: string; title: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-titulo` : undefined} className="scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={id ? `${id}-titulo` : undefined} className="font-display text-base font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Botão/links no estilo da administração (compactos). */
export const btn = {
  primary:
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-foreground px-3 text-sm font-medium text-background hover:bg-foreground/85 disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
  secondary:
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:border-foreground/40 disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
  ghost:
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50",
  danger:
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-300 bg-card px-3 text-sm font-medium text-red-800 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950",
};

export const input =
  "h-8 w-full rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:border-foreground focus:ring-[3px] focus:ring-ring/20 disabled:bg-muted";

export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("font-medium underline decoration-border underline-offset-4 hover:decoration-foreground", className)}>
      {children}
    </Link>
  );
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function formatAge(iso: string | null | undefined, now = new Date()) {
  if (!iso) return "nunca";
  const h = (now.getTime() - new Date(iso).getTime()) / 3600_000;
  if (h < 1) return "há menos de 1 h";
  if (h < 48) return `há ${Math.round(h)} h`;
  return `há ${Math.round(h / 24)} dias`;
}

export function brl(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
