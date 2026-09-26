import Link from "next/link";
import { PawPrint } from "lucide-react";

import { siteConfig } from "@/config/site";

export function SiteLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-xl font-display text-lg font-extrabold tracking-tight">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <PawPrint className="size-5" aria-hidden />
      </span>
      {siteConfig.name}
    </Link>
  );
}
