export interface ZoneSummaryInput {
  name: string;
  min_order: number;
  delivery_fee: number;
  is_default: boolean;
  is_active: boolean;
}

export function formatDeliveryZoneSummary(zone: ZoneSummaryInput): string {
  const min = `mínimo ${Number(zone.min_order).toFixed(0)}€`;
  const fee =
    Number(zone.delivery_fee) > 0
      ? `taxa ${Number(zone.delivery_fee).toFixed(0)}€`
      : "entrega grátis";
  return `${zone.name} • ${min} • ${fee}`;
}

export function formatDeliveryZoneMeta(zone: ZoneSummaryInput): string {
  const parts: string[] = [];
  if (zone.is_default) parts.push("Fallback");
  if (!zone.is_active) parts.push("Inactiva");
  return parts.join(" · ");
}
