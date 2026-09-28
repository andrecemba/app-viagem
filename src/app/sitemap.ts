import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/catalog/public";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await getCatalog();
  const staticPaths = ["", "/sobre", "/faq", "/divulgacao-de-afiliados", "/contato"];
  return [
    ...staticPaths.map((p) => ({ url: `${siteConfig.url}${p}` })),
    ...items.filter((i) => !i.demoProduct).map((i) => ({ url: `${siteConfig.url}/produto/${i.slug}`, lastModified: i.updatedAt ?? undefined })),
  ];
}
