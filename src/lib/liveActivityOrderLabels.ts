/** Etiquetas e formatação partilhadas pelos cartões no ecrã (equipa + cliente). */

export function formatLiveActivityOrderNumber(raw: string | number | null | undefined): string {
  const trimmed = String(raw ?? "?").trim();
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(4, "0");
  return trimmed;
}

export function formatLiveActivityPrice(total: number, locale = "pt-PT"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(
    Number.isFinite(total) ? total : 0,
  );
}

export function staffLiveActivityModalityLabel(
  orderType: string | null | undefined,
  tableNumber?: string | null,
): string {
  const type = (orderType ?? "takeaway").toLowerCase();
  if (type === "delivery") return "Entrega";
  if (type === "dine_in") {
    const table = tableNumber?.trim();
    return table ? `Mesa ${table}` : "Mesa";
  }
  return "Balcão";
}

export function customerLiveActivityStepIndex(status: string): number {
  switch (status) {
    case "pending":
      return 0;
    case "preparing":
      return 1;
    case "ready":
      return 2;
    case "out_for_delivery":
      return 3;
    case "delivered":
    case "completed":
      return 4;
    default:
      return 0;
  }
}

export const CUSTOMER_LIVE_ACTIVITY_STEPS = [
  "Pedido recebido",
  "Em preparação",
  "Pronto",
  "Saiu para entrega",
  "Entregue",
] as const;
