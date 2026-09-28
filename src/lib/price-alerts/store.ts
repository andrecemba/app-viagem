import "server-only";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { adminDataDir } from "@/lib/admin/repository";

/**
 * Pedidos de "Avisar oferta". Contém e-mail (dado pessoal): fica só no servidor,
 * nunca aparece em tela pública, e o admin vê apenas contagens.
 * Envio dos e-mails: depende de um serviço de envio (ver docs/ADMIN.md).
 */
export interface PriceAlertRequest {
  at: string;
  email: string;
  /** null = qualquer ração em promoção (pedido feito no Top descontos). */
  productId: string | null;
  productName: string | null;
  /** Preço no momento do pedido. */
  priceAtRequest: number | null;
  /** null = avisar em qualquer queda. */
  targetPrice: number | null;
}

const file = () => path.join(adminDataDir(), "avisos.jsonl");

export async function savePriceAlert(req: PriceAlertRequest) {
  await mkdir(adminDataDir(), { recursive: true });
  await appendFile(file(), `${JSON.stringify(req)}\n`, "utf8");
}

export async function readPriceAlerts(): Promise<PriceAlertRequest[]> {
  try {
    return (await readFile(file(), "utf8"))
      .split("\n")
      .filter(Boolean)
      .flatMap((l) => {
        try {
          return [JSON.parse(l) as PriceAlertRequest];
        } catch {
          return [];
        }
      });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

/** O envio só é real quando um serviço de e-mail estiver configurado. */
export function alertSendingActive() {
  return Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM);
}
