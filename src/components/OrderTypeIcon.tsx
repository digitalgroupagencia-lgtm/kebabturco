import { UtensilsCrossed, ShoppingBag, Bike, type LucideIcon } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";

export type CustomerOrderType = "here" | "takeaway" | "delivery";

const FALLBACKS: Record<CustomerOrderType, LucideIcon> = {
  here: UtensilsCrossed,
  takeaway: ShoppingBag,
  delivery: Bike,
};

export function useOrderTypeIconUrl(type: CustomerOrderType): string | null {
  const { settings } = useBranding();
  if (type === "here") return settings?.icon_dine_in_url || null;
  if (type === "takeaway") return settings?.icon_takeaway_url || null;
  return (settings as { icon_delivery_url?: string | null })?.icon_delivery_url || null;
}

type Props = {
  type: CustomerOrderType;
  imgClassName?: string;
  iconClassName?: string;
};

/** Mesmo ícone da tela inicial de modalidade (foto configurada ou fallback). */
export default function OrderTypeIcon({
  type,
  imgClassName = "h-full w-full object-contain",
  iconClassName = "h-5 w-5 text-primary",
}: Props) {
  const url = useOrderTypeIconUrl(type);
  const Fallback = FALLBACKS[type];

  if (url) {
    return <img src={url} alt="" className={imgClassName} draggable={false} loading="lazy" />;
  }

  return <Fallback className={iconClassName} strokeWidth={1.6} />;
}
