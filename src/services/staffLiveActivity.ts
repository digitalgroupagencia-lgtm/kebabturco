import { registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIOSAppSync } from "@/lib/nativeAppPlatform";

export type StaffLiveActivityState = {
  title: string;
  message: string;
  timer: string;
  status: string;
  urgent: "0" | "1";
};

type LiveActivityPlugin = {
  isAvailable(): Promise<{ available: boolean }>;
  startActivity(options: {
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
  isRunning(options: { id: string }): Promise<{ running: boolean }>;
  observePushToStartToken?(): Promise<void>;
  setUpdateTokenEndpoint?(options: { url: string; headers?: Record<string, string> }): Promise<void>;
  addListener?(
    eventName: string,
    listenerFunc: (data: { token?: string }) => void,
  ): Promise<{ remove: () => void }>;
};

const LiveActivity = registerPlugin<LiveActivityPlugin>("LiveActivity");

const activeOrderActivities = new Map<string, number>();
let pushToStartObserverStarted = false;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildState(orderNumber: string, startedAt: number, urgent: boolean): StaffLiveActivityState {
  return {
    title: `Novo pedido #${orderNumber}`,
    message: urgent ? "Urgente — aceite já no painel" : "Aguarda aceitação da equipa",
    timer: formatElapsed(Date.now() - startedAt),
    status: urgent ? "!" : "•••",
    urgent: urgent ? "1" : "0",
  };
}

async function issueAcceptToken(orderId: string, storeId: string): Promise<{ token: string; acceptUrl: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("issue-live-activity-accept-token", {
      body: { order_id: orderId, store_id: storeId },
    });
    if (error || !data?.token) return null;
    return {
      token: String(data.token),
      acceptUrl: String(data.accept_url ?? `${SUPABASE_URL}/functions/v1/accept-order-from-live-activity`),
    };
  } catch {
    return null;
  }
}

export async function ensureStaffLiveActivityPushToStart(storeId: string): Promise<void> {
  if (!isNativeIOSAppSync() || pushToStartObserverStarted) return;
  pushToStartObserverStarted = true;

  try {
    await LiveActivity.observePushToStartToken?.();
  } catch {
    /* plugin antigo */
  }

  try {
    LiveActivity.addListener?.("liveActivityPushToStartToken", async (event: { token?: string }) => {
      const token = event?.token?.trim();
      if (!token || !storeId) return;
      await supabase.functions.invoke("register-staff-live-activity-token", {
        body: { store_id: storeId, push_to_start_token: token, token_kind: "push_to_start" },
      });
    });
  } catch {
    /* ignore */
  }
}

export async function isStaffLiveActivitySupported(): Promise<boolean> {
  if (!isNativeIOSAppSync()) return false;
  try {
    const { available } = await LiveActivity.isAvailable();
    return available;
  } catch {
    return false;
  }
}

export async function startStaffOrderLiveActivity(
  orderId: string,
  orderNumber: string,
  storeId: string,
): Promise<void> {
  if (!(await isStaffLiveActivitySupported())) return;

  void ensureStaffLiveActivityPushToStart(storeId);

  const tokenBundle = await issueAcceptToken(orderId, storeId);
  const startedAt = Date.now();
  const state = buildState(orderNumber, startedAt, false);

  try {
    await LiveActivity.startActivity({
      id: orderId,
      attributes: {
        orderId,
        orderNumber,
        storeId,
        acceptToken: tokenBundle?.token ?? "",
        acceptUrl: tokenBundle?.acceptUrl ?? `${SUPABASE_URL}/functions/v1/accept-order-from-live-activity`,
        apiKey: SUPABASE_ANON,
      },
      contentState: { ...state },
    });

    if (activeOrderActivities.has(orderId)) {
      window.clearInterval(activeOrderActivities.get(orderId)!);
    }

    const tick = window.setInterval(() => {
      const urgent = Date.now() - startedAt >= 5 * 60 * 1000;
      const next = buildState(orderNumber, startedAt, urgent);
      void LiveActivity.updateActivity({
        id: orderId,
        contentState: { ...next },
        alert: urgent ? { title: next.title, body: next.message, sound: "default" } : undefined,
      }).catch(() => undefined);
    }, 30_000);

    activeOrderActivities.set(orderId, tick);
  } catch {
    /* extensão indisponível */
  }
}

export async function endStaffOrderLiveActivity(orderId: string): Promise<void> {
  const tick = activeOrderActivities.get(orderId);
  if (tick) {
    window.clearInterval(tick);
    activeOrderActivities.delete(orderId);
  }
  if (!(await isStaffLiveActivitySupported())) return;
  try {
    await LiveActivity.endActivity({ id: orderId, dismissalPolicy: "immediate" });
  } catch {
    /* ignore */
  }
}
