"use client";

type ClientEvent =
  | { type: "busca"; q: string; results: number }
  | { type: "filtro"; dim: string; value: string }
  | { type: "produto"; id: string };

/** Envia um evento sem atrasar a navegação (sendBeacon; fetch keepalive como reserva). */
export function track(event: ClientEvent) {
  try {
    const body = JSON.stringify(event);
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/eventos", blob)) return;
    void fetch("/api/eventos", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch {
    // Métrica nunca pode quebrar a página.
  }
}
