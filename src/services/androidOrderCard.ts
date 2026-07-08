/**
 * Cartão persistente no Android (melhor equivalente ao iPhone).
 * Usa notificações locais quando a app está aberta; com app fechada o servidor envia FCM sticky.
 */
import { isNativeAndroidAppSync } from "@/lib/nativeAppPlatform";

type OrderCardOpts = {
  id: string;
  title: string;
  body: string;
  status?: string;
  url: string;
  accentColor?: string;
  ongoing?: boolean;
  acceptUrl?: string;
};

const activeIds = new Set<string>();

async function ensureChannel() {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.createChannel({
      id: "order_cards",
      name: "Cartões de pedido",
      description: "Acompanhar pedidos em tempo real",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  } catch {
    /* plugin indisponível — FCM sticky do servidor */
  }
}

function stableId(raw: string): number {
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  return Math.abs(hash) % 2000000000;
}

export async function showAndroidOrderCard(opts: OrderCardOpts): Promise<void> {
  if (!isNativeAndroidAppSync()) return;
  activeIds.add(opts.id);
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await ensureChannel();
    const notificationId = stableId(opts.id);
    const actions = [];
    if (opts.acceptUrl) {
      actions.push({ id: "accept", title: "Aceitar pedido" });
    }
    actions.push({ id: "open", title: opts.acceptUrl ? "Abrir pedido" : "Acompanhar" });

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: opts.title,
          body: opts.body,
          channelId: "order_cards",
          ongoing: opts.ongoing ?? true,
          autoCancel: false,
          extra: {
            url: opts.url,
            accept_url: opts.acceptUrl,
            status: opts.status ?? "",
            card_id: opts.id,
            actions,
          },
          actionTypeId: actions.length ? "ORDER_CARD" : undefined,
        },
      ],
    });
  } catch {
    /* FCM do servidor cobre app fechada */
  }
}

export async function endAndroidOrderCard(id: string): Promise<void> {
  if (!isNativeAndroidAppSync()) return;
  activeIds.delete(id);
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: stableId(id) }] });
  } catch {
    /* ignore */
  }
}

export async function initAndroidOrderCardActions(): Promise<void> {
  if (!isNativeAndroidAppSync()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.registerActionTypes({
      types: [{ id: "ORDER_CARD", actions: [{ id: "accept", title: "Aceitar" }, { id: "open", title: "Abrir" }] }],
    });
    await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      const extra = (event.notification.extra ?? {}) as Record<string, string>;
      const action = event.actionId;
      if (action === "accept" && extra.accept_url) {
        window.location.assign(extra.accept_url);
        return;
      }
      if (extra.url) window.location.assign(extra.url);
    });
  } catch {
    /* ignore */
  }
}

export function isAndroidOrderCardActive(id: string): boolean {
  return activeIds.has(id);
}
