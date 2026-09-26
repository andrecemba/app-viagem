import {
  Bone,
  Cat,
  Coins,
  Crown,
  Dog,
  Glasses,
  PawPrint,
  Scale,
  Sparkles,
  Star,
  Stethoscope,
} from "lucide-react";

import type { IconKey } from "@/config/taxonomy";
import { cn } from "@/lib/utils";

import { DryFoodIcon, PuppyIcon, WetFoodIcon } from "./food-icons";

/** Porte: o mesmo cão em escalas diferentes, para leitura imediata. */
const sizeScale: Partial<Record<IconKey, number>> = {
  "size-mini": 0.55,
  "size-small": 0.7,
  "size-medium": 0.85,
  "size-large": 1,
};

export function FunnelIcon({ icon, className, size = 32 }: { icon: IconKey; className?: string; size?: number }) {
  const scale = sizeScale[icon];
  if (scale) {
    return (
      <span className={cn("inline-flex items-end justify-center", className)} style={{ width: size, height: size }}>
        <Dog size={Math.round(size * scale)} strokeWidth={2} aria-hidden />
      </span>
    );
  }
  const props = { size, className, "aria-hidden": true as const };
  switch (icon) {
    case "dog":
      return <Dog {...props} />;
    case "cat":
      return <Cat {...props} />;
    case "dry":
      return <DryFoodIcon {...props} />;
    case "wet":
      return <WetFoodIcon {...props} />;
    case "snack":
      return <Bone {...props} />;
    case "vet":
      return <Stethoscope {...props} />;
    case "puppy":
      return <PuppyIcon {...props} />;
    case "adult":
      return <PawPrint {...props} />;
    case "senior":
      return <Glasses {...props} />;
    case "neutered":
      return <Scale {...props} />;
    case "economy":
      return <Coins {...props} />;
    case "standard":
      return <Star {...props} />;
    case "premium":
      return <Sparkles {...props} />;
    case "super-premium":
      return <Crown {...props} />;
    default:
      return <PawPrint {...props} />;
  }
}
