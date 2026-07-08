import { registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIOSAppSync, isNativeAndroidAppSync } from "@/lib/nativeAppPlatform";
import {
  customerStatusLabel,
  mergeLiveActivitySettings,
  type LiveActivitySettings,
} from "@/lib/liveActivitySettings";
import {
  customerLiveActivityStepIndex,
  formatLiveActivityOrderNumber,
} from "@/lib/liveActivityOrderLabels";
import { showAndroidOrderCard, endAndroidOrderCard } from "@/services/androidOrderCard";

type LiveActivityPlugin = {
  isAvailable(): Promise<{ available: boolean }>;
  startActivity(options: {
    id: string;
    attributes: Record<string, string>;
    contentState: Record<string, string>;
  }): Promise<{ activityId: string }>;
  startActivityWithPush?(options: {
    id: string;
    attributes: Record<string, string>;
    contentState: Record<string, string>;
  }): Promise<{ activityId: string }>;
  updateActivity(options: {
    id: string;
    contentState: Record<string, string>;
    alert?: { title: string; body: string; sound?: string };
  }): Promise<void>;
  endActivity(options: { id: string; dismissalPolicy?: "immediate" | "default" }): Promise<void>;
  observePushToStartToken?(): Promise<void>;
  setUpdateTokenEndpoint?(options: { url: string; headers?: Record<string, string> }): Promise<void>;
  addListener?(
    eventName: string,
    listenerFunc: (data: Record<string, string | undefined>) => void,
  ): Promise<{ remove: () => void }>;
};

const LiveActivity = registerPlugin<LiveActivityPlugin>("LiveActivity");

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const activeCustomerCards = new Set<string>();

async function loadSettings(storeId: string): Promise<LiveActivitySettings> {
  const { data } = await supabase
    .from("operations_settings")
    .select(
      "la_staff_card_title, la_customer_card_title, la_staff_new_message, la_staff_urgent_message, la_customer_ready_message, la_color_normal, la_color_urgent, la_urgent_after_minutes",
    )
    .eq("store_id", storeId)
    .maybeSingle();
  return mergeLiveActivitySettings(data as Partial<LiveActivitySettings> | null);
}

async function registerCustomerPushToStart(storeId: string, orderId: string): Promise<void> {
  if (!isNativeIOSAppSync()) return;
  try {
    await LiveActivity.observePushToStartToken?.();
    LiveActivity.addListener?.("liveActivityPushToStartToken", async (event) => {
      const token = event?.token?.trim();
      if (!token) return;
      await supabase.functions.invoke("register-staff-live-activity-token", {
        body: {
          store_id: storeId,
          order_id: orderId,
          push_to_start_token: token,
          token_kind: "customer_push_to_start",
        },
      });
    });
  } catch {
    /* ignore */
  }
}

async function ensureCustomerUpdateEndpoint(): Promise<void> {
  if (!isNativeIOSAppSync()) return;
  try {
    const { data: session } = await supabase.auth.getSession();
    const jwt = session.session?.access_token;
    await LiveActivity.setUpdateTokenEndpoint?.({
      url: `${SUPABASE_URL}/functions/v1/register-live-activity-update-token`,
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
    });
    LiveActivity.addListener?.("liveActivityPushToken", async (event) => {
      const token = event?.token?.trim();
      const id = event?.id?.trim();
      if (!token || !id) return;
      await supabase.functions.invoke("register-live-activity-update-token", {
        body: { activity_id: id, order_id: id.replace(/^customer-/, ""), token },
      });
    });
  } catch {
    /* ignore */
  }
}

function buildCustomerState(
  orderNumber: string,
  status: string,
  settings: LiveActivitySettings,
): Record<string, string> {
  const label = customerStatusLabel(status);
  const message = status === "ready" ? settings.la_customer_ready_message : label;
  const formatted = formatLiveActivityOrderNumber(orderNumber);
  return {
    title: settings.la_customer_card_title,
    orderNumber: formatted,
    message,
    timer: "",
    status: label,
    step: String(customerLiveActivityStepIndex(status)),
    urgent: "0",
    colorNormal: settings.la_color_normal,
    colorUrgent: settings.la_color_urgent,
    role: "customer",
  };
}

export async function syncCustomerOrderLiveActivity(
  storeId: string,
  orderId: string,
  orderNumber: string,
  status: string,
): Promise<void> {
  const terminal = new Set(["delivered", "completed", "cancelled"]);
  if (terminal.has(status)) {
    await endCustomerOrderLiveActivity(orderId);
    return;
  }

  const settings = await loadSettings(storeId);
  const state = buildCustomerState(orderNumber, status, settings);
  const cardId = `customer-${orderId}`;

  if (isNativeAndroidAppSync()) {
    await showAndroidOrderCard({
      id: cardId,
      title: state.title,
      body: state.message,
      status: state.status,
      url: `/?screen=tracking&order=${orderId}`,
      accentColor: settings.la_color_normal,
      ongoing: true,
    });
    activeCustomerCards.add(orderId);
    return;
  }

  if (!isNativeIOSAppSync()) return;

  try {
    const { available } = await LiveActivity.isAvailable();
    if (!available) return;

    await ensureCustomerUpdateEndpoint();
    void registerCustomerPushToStart(storeId, orderId);

    if (!activeCustomerCards.has(orderId)) {
      const starter = LiveActivity.startActivityWithPush ?? LiveActivity.startActivity;
      await starter.call(LiveActivity, {
        id: cardId,
        attributes: {
          orderId,
          orderNumber: formatLiveActivityOrderNumber(orderNumber),
          storeId,
          role: "customer",
        },
        contentState: state,
      });
      activeCustomerCards.add(orderId);
    } else {
      await LiveActivity.updateActivity({ id: cardId, contentState: state });
    }
  } catch {
    /* extensão indisponível */
  }
}

export async function endCustomerOrderLiveActivity(orderId: string): Promise<void> {
  activeCustomerCards.delete(orderId);
  if (isNativeAndroidAppSync()) {
    await endAndroidOrderCard(`customer-${orderId}`);
    return;
  }
  if (!isNativeIOSAppSync()) return;
  try {
    await LiveActivity.endActivity({ id: `customer-${orderId}`, dismissalPolicy: "immediate" });
  } catch {
    /* ignore */
  }
}

/** Arranque inicial quando o cliente abre o acompanhamento. */
export async function startCustomerOrderLiveActivity(
  storeId: string,
  orderId: string,
  orderNumber: string,
  status: string,
): Promise<void> {
  await syncCustomerOrderLiveActivity(storeId, orderId, orderNumber, status);
}
