import { supabase } from "@/integrations/supabase/client";

const STATUS_MESSAGES: Record<string, Record<string, string>> = {
  pending: { es: "¡Pedido recibido!", pt: "Pedido recebido!", en: "Order received!" },
  preparing: { es: "Tu pedido está en preparación", pt: "O teu pedido está a ser preparado", en: "Your order is being prepared" },
  ready: { es: "¡Tu pedido está listo!", pt: "O teu pedido está pronto!", en: "Your order is ready!" },
  out_for_delivery: { es: "¡Tu pedido salió para entrega!", pt: "O teu pedido saiu para entrega!", en: "Your order is out for delivery!" },
  delivered: { es: "¡Pedido entregado! ¡Buen provecho!", pt: "Pedido entregue! Bom apetite!", en: "Order delivered! Enjoy!" },
  collected: { es: "¡Pedido recogido!", pt: "Pedido recolhido!", en: "Order collected!" },
  served: { es: "¡Pedido servido!", pt: "Pedido servido!", en: "Order served!" },
  cancelled: { es: "Tu pedido fue cancelado", pt: "O teu pedido foi cancelado", en: "Your order was cancelled" },
  payment_paid: { es: "¡Pago confirmado!", pt: "Pagamento confirmado!", en: "Payment confirmed!" },
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
    `Pedido #${orderNumber || ""}, ${status}`;

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

/** Aviso push para equipa do restaurante quando entra pedido novo. */
export async function notifyStaffNewOrder(
  storeId: string,
  orderId: string,
  orderNumber: string,
) {
  try {
    await supabase.functions.invoke("send-push-notification", {
      body: {
        storeId,
        title: `Nuevo pedido #${orderNumber}`,
        body: "Pedido recibido, abre el panel para ver detalles",
        tag: `staff-new-order-${orderId}`,
        url: "/panel/live",
      },
    });
  } catch {
    /* não bloqueia operação */
  }
}

/** Campanha push para clientes com app (menu ou pedidos anteriores). */
export async function notifyStoreMarketingBroadcast(
  storeId: string,
  title: string,
  body: string,
  url = "/",
) {
  try {
    await supabase.functions.invoke("send-push-notification", {
      body: {
        storeId,
        audience: "marketing",
        title,
        body,
        tag: `marketing-${storeId}-${Date.now()}`,
        url,
      },
    });
  } catch {
    /* não bloqueia operação */
  }
}
