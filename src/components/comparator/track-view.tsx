"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics/client";

/** Conta uma visita à página do produto (uma vez por carregamento). */
export function TrackView({ id }: { id: string }) {
  useEffect(() => {
    track({ type: "produto", id });
  }, [id]);
  return null;
}
