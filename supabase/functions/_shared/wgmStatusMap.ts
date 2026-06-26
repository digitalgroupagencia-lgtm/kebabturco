/** Kebab order_status ↔ WGM status_operacional */
export const KEBAB_TO_WGM_STATUS: Record<string, string> = {
  pending: "pendente",
  preparing: "em_preparo",
  ready: "pronto",
  out_for_delivery: "entregue",
  delivered: "finalizado",
  cancelled: "cancelado",
};

export const WGM_TO_KEBAB_STATUS: Record<string, string> = {
  novo: "pending",
  pendente: "pending",
  em_preparo: "preparing",
  pronto: "ready",
  entregue: "out_for_delivery",
  finalizado: "delivered",
  cancelado: "cancelled",
};

/** Status ProprioApp enviados pelo webhook WGM */
export const PROPRIOAPP_TO_KEBAB_STATUS: Record<string, string> = {
  received: "pending",
  accepted: "pending",
  preparing: "preparing",
  ready: "ready",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "cancelled",
  pending: "pending",
  collected: "delivered",
  served: "delivered",
};

export function kebabStatusToWgm(status: string): string {
  return KEBAB_TO_WGM_STATUS[status] ?? "pendente";
}

export function proprioappStatusToKebab(status: string): string | null {
  return PROPRIOAPP_TO_KEBAB_STATUS[status] ?? null;
}
