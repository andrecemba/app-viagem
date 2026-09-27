import type { SVGProps } from "react";

/**
 * Ícones próprios do comparador. Mesma grade (24 × 24), traço de 1,5 px,
 * pontas e junções arredondadas; olhos e focinho preenchidos para dar peso.
 * Herdam a cor do texto (currentColor).
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function DogIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6.8 10c0-3 2.3-5.2 5.2-5.2s5.2 2.2 5.2 5.2v3.3c0 3.6-2.3 6.2-5.2 6.2s-5.2-2.6-5.2-6.2Z" />
      <path d="M7.6 6.6C5.9 5.6 3.7 6.2 3.2 8.6c-.5 2.5.3 5 1.9 5.6 1 .4 1.8-.3 2-1.3" />
      <path d="M16.4 6.6c1.7-1 3.9-.4 4.4 2 .5 2.5-.3 5-1.9 5.6-1 .4-1.8-.3-2-1.3" />
      <circle cx="9.8" cy="11.1" r=".85" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="11.1" r=".85" fill="currentColor" stroke="none" />
      <path d="M10.9 14.3h2.2c0 .7-.5 1.2-1.1 1.2s-1.1-.5-1.1-1.2Z" fill="currentColor" strokeWidth={1} />
      <path d="M12 15.5v.8m-1.4.8c.6.3 1.1.1 1.4-.6.3.7.8.9 1.4.6" />
    </Base>
  );
}

export function CatIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5.3 10 4.8 4.3l4.2 2.8a9 9 0 0 1 6 0l4.2-2.8-.5 5.7c.8 1.1 1.3 2.4 1.3 3.7 0 3.8-3.6 6.5-8 6.5s-8-2.7-8-6.5c0-1.3.5-2.6 1.3-3.7Z" />
      <circle cx="9.3" cy="12.3" r=".85" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="12.3" r=".85" fill="currentColor" stroke="none" />
      <path d="M10.9 14.6h2.2c0 .7-.5 1.2-1.1 1.2s-1.1-.5-1.1-1.2Z" fill="currentColor" strokeWidth={1} />
      <path d="M12 15.8v.6m-1.4.8c.6.3 1.1.1 1.4-.6.3.7.8.9 1.4.6" />
      <path d="M2.9 14.2l2.3.3m-1.9 2.2 2.1-.5m15.7-2-2.3.3m1.9 2.2-2.1-.5" />
    </Base>
  );
}

/** Contorno genérico de embalagem, sem marca: usado só no marcador de foto ilustrativa. */
export function PackageOutlineIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7.5 3.5h9l1.5 3.2v12.8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6.7Z" />
      <path d="M6 6.7h12" />
      <path d="M9 11h6v5H9z" />
    </Base>
  );
}
