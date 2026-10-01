"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics/client";

export const RECENT_KEY = "racao:vistos";

/** Conta a visita (uma vez por carregamento) e guarda a ração nos "vistos recentemente" deste navegador. */
export function TrackView({ id, slug }: { id: string; slug: string }) {
  useEffect(() => {
    track({ type: "produto", id });
    try {
      const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
      localStorage.setItem(RECENT_KEY, JSON.stringify([slug, ...list.filter((s) => s !== slug)].slice(0, 8)));
    } catch {
      /* armazenamento indisponível: segue sem histórico */
    }
  }, [id, slug]);
  return null;
}
