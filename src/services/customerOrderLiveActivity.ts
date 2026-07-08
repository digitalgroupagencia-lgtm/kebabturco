import { isNativeIOSAppSync } from "@/lib/nativeAppPlatform";
import { registerPlugin } from "@capacitor/core";

type LiveActivityPlugin = {
  isAvailable(): Promise<{ available: boolean }>;
  startActivity(options: {
    id: string;
    attributes: Record<string, string>;
    contentState: Record<string, string>;
  }): Promise<{ activityId: string }>;
  endActivity(options: { id: string; dismissalPolicy?: "immediate" | "default" }): Promise<void>;
};

const LiveActivity = registerPlugin<LiveActivityPlugin>("LiveActivity");

/** Cartão no ecrã para o cliente quando o pedido fica pronto (iPhone, futuro). */
export async function showCustomerOrderReadyLiveActivity(
  orderId: string,
  orderNumber: string,
): Promise<void> {
  if (!isNativeIOSAppSync()) return;
  try {
    const { available } = await LiveActivity.isAvailable();
    if (!available) return;
    await LiveActivity.startActivity({
      id: `customer-${orderId}`,
      attributes: { orderId, orderNumber, role: "customer" },
      contentState: {
        title: `Pedido #${orderNumber} pronto`,
        message: "Pode levantar no balcão",
        timer: "",
        status: "✓",
        urgent: "0",
      },
    });
  } catch {
    /* extensão equipa — cartão cliente completo numa fase seguinte */
  }
}

export async function endCustomerOrderLiveActivity(orderId: string): Promise<void> {
  if (!isNativeIOSAppSync()) return;
  try {
    await LiveActivity.endActivity({ id: `customer-${orderId}`, dismissalPolicy: "immediate" });
  } catch {
    /* ignore */
  }
}
