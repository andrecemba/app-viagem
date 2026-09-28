import type { Db } from "@/lib/db/util";

/** Pedidos de "Avisar oferta". O e-mail fica só no servidor; o admin vê contagens. */
export interface PriceAlertRequest {
  at: string;
  email: string;
  productId: number | null;
  priceAtRequest: number | null;
  targetPrice: number | null;
}

export function savePriceAlert(db: Db, r: PriceAlertRequest) {
  db.prepare("INSERT INTO price_alert_requests (at, email, product_id, price_at_request, target_price) VALUES (?, ?, ?, ?, ?)").run(
    r.at,
    r.email,
    r.productId,
    r.priceAtRequest,
    r.targetPrice,
  );
}

export function alertCountsByProduct(db: Db, since: string) {
  return db
    .prepare(
      `SELECT product_id AS productId, COUNT(*) AS count, SUM(target_price IS NOT NULL) AS targets FROM price_alert_requests
       WHERE at >= ? GROUP BY product_id ORDER BY count DESC`,
    )
    .all(since) as { productId: number | null; count: number; targets: number }[];
}

/** O envio só é real quando um serviço de e-mail estiver configurado. */
export function alertSendingActive() {
  return Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM);
}
