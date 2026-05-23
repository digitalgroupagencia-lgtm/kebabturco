import { supabase } from "@/integrations/supabase/client";

const STATUS_MESSAGES: Record<string, Record<string, string>> = {
  pending: { es: "¡Pedido recibido!", pt: "Pedido recebido!" },
  preparing: { es: "Tu pedido está en preparación", pt: "O teu pedido está a ser preparado" },
  ready: { es: "¡Tu pedido está listo!", pt: "O teu pedido está pronto!" },
  out_for_delivery: { es: "¡Tu pedido salió para entrega!", pt: "O teu pedido saiu para entrega!" },
  delivered: { es: "¡Pedido entregado! ¡Buen provecho!", pt: "Pedido entregue! Bom apetite!" },
  cancelled: { es: "Tu pedido fue cancelado", pt: "O teu pedido foi cancelado" },
};

export async function notifyOrderStatusChange(
  orderId: string,
  status: string,
  orderNumber?: string,
  lang = "es",
) {
  const body =
    STATUS_MESSAGES[status]?.[lang] ||
    STATUS_MESSAGES[status]?.es ||
    `Pedido #${orderNumber || ""} — ${status}`;

  try {
    await supabase.functions.invoke("send-push-notification", {
      body: {
        orderId,
        title: `Pedido #${orderNumber || ""}`,
        body,
        tag: `order-${orderId}`,
        url: `/?screen=tracking&order=${orderId}`,
      },
    });
  } catch {
    // não bloqueia operação
  }
}
