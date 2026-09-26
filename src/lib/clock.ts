import { siteConfig } from "@/config/site";
import { MOCK_NOW } from "@/data/mock/random";

/** "Agora" para textos relativos. Com dados de exemplo, é fixo (evita divergência servidor/cliente). */
export function referenceNow() {
  return siteConfig.isMockData ? MOCK_NOW : new Date();
}
