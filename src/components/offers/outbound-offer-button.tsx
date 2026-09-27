"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

import { outboundLinkProps } from "./outbound";
import { useRelatedDrawer, type DrawerRequest } from "./related-drawer";

/**
 * Botão "Ver oferta": o link abre a loja em nova aba normalmente (o navegador
 * segue o href); o painel de sugestões abre depois, sem bloquear nada.
 */
export function OutboundOfferButton({
  offerId,
  drawer,
  label = "Ver oferta",
  size = "default",
  variant = "default",
  className,
}: {
  offerId: string;
  drawer?: DrawerRequest;
  label?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const openDrawer = useRelatedDrawer();
  if (!siteConfig.outboundLinksEnabled) {
    // Sem links de afiliado ativos: o botão não finge levar à loja.
    return (
      <Button size={size} variant="outline" className={cn(className)} disabled title="Links de compra ainda não estão ativos">
        Link da loja em breve
      </Button>
    );
  }
  return (
    <Button asChild size={size} variant={variant} className={cn(className)}>
      <a
        {...outboundLinkProps(offerId)}
        onClick={() => {
          if (drawer) window.setTimeout(() => openDrawer(drawer), 0);
        }}
      >
        {label}
        <ExternalLink />
      </a>
    </Button>
  );
}
