/** Todo clique de saída passa por /ir/[offerId] (registro do clique + resolução do link de afiliado). */
export function outboundHref(offerId: string) {
  return `/ir/${encodeURIComponent(offerId)}`;
}

export function outboundLinkProps(offerId: string) {
  return {
    href: outboundHref(offerId),
    target: "_blank",
    rel: "sponsored nofollow noopener",
  } as const;
}
