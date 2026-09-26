import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getBrands, getProductSlugs } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, brands] = await Promise.all([getProductSlugs(), getBrands()]);
  const staticPaths = ["", "/caes", "/gatos", "/marcas", "/calculadora", "/sobre", "/faq", "/divulgacao-de-afiliados", "/contato"];
  return [
    ...staticPaths.map((p) => ({ url: `${siteConfig.url}${p}` })),
    ...brands.map((b) => ({ url: `${siteConfig.url}/marca/${b.slug}` })),
    ...slugs.map((s) => ({ url: `${siteConfig.url}/produto/${s}`, changeFrequency: "daily" as const })),
  ];
}
