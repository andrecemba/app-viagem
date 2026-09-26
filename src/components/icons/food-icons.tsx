import type { SVGProps } from "react";

/** Ícones próprios, no mesmo traço do lucide (24×24, stroke 2, pontas arredondadas). */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

/** Saco de ração seca. */
export function DryFoodIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 3h10l-1 3 2 3v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9l2-3z" />
      <path d="M8 6h8" />
      <circle cx="10" cy="14" r="1" />
      <circle cx="14" cy="13" r="1" />
      <circle cx="12.5" cy="16.5" r="1" />
    </svg>
  );
}

/** Lata / sachê de alimento úmido. */
export function WetFoodIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <ellipse cx="12" cy="7" rx="7" ry="2.5" />
      <path d="M5 7v10c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V7" />
      <path d="M9.5 13.5c1.5-1.5 3.5-1.5 5 0-1.5 1.5-3.5 1.5-5 0z" />
      <path d="M14.5 13.5l1.5-1v2z" />
    </svg>
  );
}

/** Pata com coração: filhote. */
export function PuppyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="7" cy="8" r="1.8" />
      <circle cx="12" cy="6" r="1.8" />
      <circle cx="17" cy="8" r="1.8" />
      <path d="M12 20s-5-2.9-5-6.3A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1 5 1.7C17 17.1 12 20 12 20z" />
    </svg>
  );
}
