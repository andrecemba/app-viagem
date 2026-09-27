import Link from "next/link";

import { REGION_LABEL } from "@/config/comparator";
import { siteConfig } from "@/config/site";

/** Marca tipográfica: nome em Montserrat e a região ao lado (oculta em telas estreitas). */
export function SiteLogo() {
  return (
    <Link href="/" className="flex items-baseline gap-2.5 rounded-md">
      <span className="font-display text-[1.0625rem] font-bold tracking-tight">{siteConfig.name}</span>
      <span className="hidden border-l pl-2.5 text-xs text-muted-foreground sm:inline">{REGION_LABEL}</span>
    </Link>
  );
}
