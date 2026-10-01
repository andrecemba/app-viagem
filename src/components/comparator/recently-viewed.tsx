"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { History } from "lucide-react";

import { formatBRL } from "@/lib/format";

import { RECENT_KEY } from "./track-view";

export interface RecentCandidate {
  slug: string;
  name: string;
  weight: string;
  price: number | null;
}

function readRecent(): string {
  try {
    return localStorage.getItem(RECENT_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

/** Rações vistas neste navegador (nada vai para o servidor). */
export function RecentlyViewed({ candidates }: { candidates: RecentCandidate[] }) {
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    readRecent,
    () => "[]",
  );
  let slugs: string[] = [];
  try {
    slugs = JSON.parse(raw) as string[];
  } catch {
    slugs = [];
  }
  const bySlug = new Map(candidates.map((c) => [c.slug, c]));
  const list = slugs.map((s) => bySlug.get(s)).filter((c): c is RecentCandidate => Boolean(c)).slice(0, 6);
  if (!list.length) return null;
  return (
    <section aria-labelledby="vistos" className="min-w-0">
      <h2 id="vistos" className="flex items-center gap-1.5 text-sm font-semibold">
        <History className="size-4" aria-hidden /> Vistos recentemente
      </h2>
      <ul className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {list.map((c) => (
          <li key={c.slug} className="shrink-0">
            <Link href={`/produto/${c.slug}`} className="block w-52 rounded-md border bg-card px-3 py-2 transition-colors hover:border-foreground/40">
              <span className="block truncate text-sm font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {c.weight}
                {c.price != null && ` · a partir de ${formatBRL(c.price)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
