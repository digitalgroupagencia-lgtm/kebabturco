export type LiveActivitySettings = {
  la_staff_card_title: string;
  la_customer_card_title: string;
  la_staff_new_message: string;
  la_staff_urgent_message: string;
  la_customer_ready_message: string;
  la_color_normal: string;
  la_color_urgent: string;
  la_urgent_after_minutes: number;
};

export const DEFAULT_LIVE_ACTIVITY_SETTINGS: LiveActivitySettings = {
  la_staff_card_title: "Novo pedido",
  la_customer_card_title: "O seu pedido",
  la_staff_new_message: "Aguarda aceitação da equipa",
  la_staff_urgent_message: "Urgente — aceite já",
  la_customer_ready_message: "Pode levantar no balcão",
  la_color_normal: "#3A0205",
  la_color_urgent: "#5A080C",
  la_urgent_after_minutes: 5,
};

export function mergeLiveActivitySettings(
  row: Partial<LiveActivitySettings> | null | undefined,
): LiveActivitySettings {
  const base = DEFAULT_LIVE_ACTIVITY_SETTINGS;
  if (!row) return base;
  const mins = Number(row.la_urgent_after_minutes);
  return {
    la_staff_card_title: row.la_staff_card_title?.trim() || base.la_staff_card_title,
    la_customer_card_title: row.la_customer_card_title?.trim() || base.la_customer_card_title,
    la_staff_new_message: row.la_staff_new_message?.trim() || base.la_staff_new_message,
    la_staff_urgent_message: row.la_staff_urgent_message?.trim() || base.la_staff_urgent_message,
    la_customer_ready_message: row.la_customer_ready_message?.trim() || base.la_customer_ready_message,
    la_color_normal: normalizeHexColor(row.la_color_normal, base.la_color_normal),
    la_color_urgent: normalizeHexColor(row.la_color_urgent, base.la_color_urgent),
    la_urgent_after_minutes: Number.isFinite(mins) ? Math.min(120, Math.max(1, Math.round(mins))) : base.la_urgent_after_minutes,
  };
}

function normalizeHexColor(input: string | undefined, fallback: string): string {
  const raw = (input ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw;
  return fallback;
}

/** Etiquetas amigáveis para o cartão do cliente. */
export function customerStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pedido recebido";
    case "preparing":
      return "Em preparação";
    case "ready":
      return "Pronto";
    case "out_for_delivery":
      return "Saiu para entrega";
    case "delivered":
    case "completed":
      return "Entregue";
    case "cancelled":
      return "Cancelado";
    default:
      return "A acompanhar";
  }
}
