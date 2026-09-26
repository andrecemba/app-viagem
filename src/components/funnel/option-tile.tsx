import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function OptionTile({
  href,
  icon,
  label,
  description,
  count,
  selected,
}: {
  href: string | null;
  icon: React.ReactNode;
  label: string;
  description?: string;
  count?: number;
  selected?: boolean;
}) {
  const body = (
    <>
      {selected && (
        <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" aria-hidden />
        </span>
      )}
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl transition",
          selected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground",
        )}
      >
        {icon}
      </span>
      <span className="font-display text-sm leading-tight font-bold sm:text-base">{label}</span>
      {description && <span className="text-xs leading-snug text-muted-foreground">{description}</span>}
      {count !== undefined && (
        <span className="mt-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {count} {count === 1 ? "oferta" : "ofertas"}
        </span>
      )}
    </>
  );
  const classes = cn(
    "group relative flex min-h-36 flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center transition outline-none",
    selected && "border-primary ring-2 ring-primary/20",
  );
  if (!href) {
    return (
      <div aria-disabled className={cn(classes, "cursor-not-allowed opacity-45")}>
        {body}
      </div>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(classes, "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50")}
    >
      {body}
    </Link>
  );
}
