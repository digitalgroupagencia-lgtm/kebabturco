import { registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIOSAppSync, isNativeAndroidAppSync } from "@/lib/nativeAppPlatform";
import { mergeLiveActivitySettings, type LiveActivitySettings } from "@/lib/liveActivitySettings";
import { showAndroidOrderCard, endAndroidOrderCard } from "@/services/androidOrderCard";

export type StaffLiveActivityState = {
  title: string;
  message: string;
  timer: string;
  status: string;
  urgent: "0" | "1";
  colorNormal: string;
  colorUrgent: string;
  role: "staff";
};

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
  isRunning?(options: { id: string }): Promise<{ running: boolean }>;
  observePushToStartToken?(): Promise<void>;
  setUpdateTokenEndpoint?(options: { url: string; headers?: Record<string, string> }): Promise<void>;
  addListener?(
    eventName: string,
    listenerFunc: (data: { token?: string; id?: string }) => void,
  ): Promise<{ remove: () => void }>;
};

const LiveActivity = registerPlugin<LiveActivityPlugin>("LiveActivity");

const activeOrderActivities = new Map<string, number>();
const settingsCache = new Map<string, LiveActivitySettings>();
let pushToStartObserverStarted = false;
let updateEndpointConfigured = false;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function loadSettings(storeId: string): Promise<LiveActivitySettings> {
  const cached = settingsCache.get(storeId);
  if (cached) return cached;
  const { data } = await supabase
    .from("operations_settings")
    .select(
      "la_staff_card_title, la_customer_card_title, la_staff_new_message, la_staff_urgent_message, la_customer_ready_message, la_color_normal, la_color_urgent, la_urgent_after_minutes",
    )
    .eq("store_id", storeId)
    .maybeSingle();
  const merged = mergeLiveActivitySettings(data as Partial<LiveActivitySettings> | null);
  settingsCache.set(storeId, merged);
  return merged;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildState(
  orderNumber: string,
  startedAt: number,
  urgent: boolean,
  settings: LiveActivitySettings,
): StaffLiveActivityState {
  return {
    title: `${settings.la_staff_card_title} #${orderNumber}`,
    message: urgent ? settings.la_staff_urgent_message : settings.la_staff_new_message,
    timer: formatElapsed(Date.now() - startedAt),
    status: urgent ? "!" : "•••",
    urgent: urgent ? "1" : "0",
    colorNormal: settings.la_color_normal,
    colorUrgent: settings.la_color_urgent,
    role: "staff",
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

async function ensureUpdateTokenEndpoint(): Promise<void> {
  if (!isNativeIOSAppSync() || updateEndpointConfigured) return;
  updateEndpointConfigured = true;
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
        body: { activity_id: id, order_id: id, token },
      });
    });
  } catch {
    /* ignore */
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
    LiveActivity.addListener?.("liveActivityPushToStartToken", async (event) => {
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
  if (isNativeAndroidAppSync()) return true;
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
  const settings = await loadSettings(storeId);
  const tokenBundle = await issueAcceptToken(orderId, storeId);
  const startedAt = Date.now();
  const state = buildState(orderNumber, startedAt, false, settings);
  const acceptDeepLink = `kebabturco://staff/order/${orderId}?action=accept&store_id=${storeId}&eta=15`;

  if (isNativeAndroidAppSync()) {
    await showAndroidOrderCard({
      id: orderId,
      title: state.title,
      body: state.message,
      status: state.status,
      url: `/panel/live?order=${orderId}&action=accept&store_id=${storeId}&eta=15`,
      acceptUrl: acceptDeepLink,
      accentColor: settings.la_color_normal,
      ongoing: true,
    });
  }

  if (!(await isStaffLiveActivitySupported()) || !isNativeIOSAppSync()) {
    scheduleUrgentTick(orderId, orderNumber, storeId, startedAt, settings);
    return;
  }

  void ensureStaffLiveActivityPushToStart(storeId);
  void ensureUpdateTokenEndpoint();

  try {
    const starter = LiveActivity.startActivityWithPush ?? LiveActivity.startActivity;
    await starter.call(LiveActivity, {
      id: orderId,
      attributes: {
        orderId,
        orderNumber,
        storeId,
        role: "staff",
        acceptToken: tokenBundle?.token ?? "",
        acceptUrl: tokenBundle?.acceptUrl ?? `${SUPABASE_URL}/functions/v1/accept-order-from-live-activity`,
        apiKey: SUPABASE_ANON,
      },
      contentState: { ...state },
    });

    scheduleUrgentTick(orderId, orderNumber, storeId, startedAt, settings);
  } catch {
    /* extensão indisponível */
  }
}

function scheduleUrgentTick(
  orderId: string,
  orderNumber: string,
  storeId: string,
  startedAt: number,
  settings: LiveActivitySettings,
) {
  if (activeOrderActivities.has(orderId)) {
    window.clearInterval(activeOrderActivities.get(orderId)!);
  }

  const urgentMs = settings.la_urgent_after_minutes * 60 * 1000;
  const tick = window.setInterval(() => {
    void (async () => {
      const urgent = Date.now() - startedAt >= urgentMs;
      const next = buildState(orderNumber, startedAt, urgent, settings);
      if (isNativeAndroidAppSync()) {
        await showAndroidOrderCard({
          id: orderId,
          title: next.title,
          body: next.message,
          status: next.status,
          url: `/panel/live?order=${orderId}`,
          accentColor: urgent ? settings.la_color_urgent : settings.la_color_normal,
          ongoing: true,
        });
        return;
      }
      if (!isNativeIOSAppSync()) return;
      await LiveActivity.updateActivity({
        id: orderId,
        contentState: { ...next },
        alert: urgent ? { title: next.title, body: next.message, sound: "default" } : undefined,
      }).catch(() => undefined);
    })();
  }, 30_000);

  activeOrderActivities.set(orderId, tick);
}

export async function endStaffOrderLiveActivity(orderId: string): Promise<void> {
  const tick = activeOrderActivities.get(orderId);
  if (tick) {
    window.clearInterval(tick);
    activeOrderActivities.delete(orderId);
  }
  if (isNativeAndroidAppSync()) {
    await endAndroidOrderCard(orderId);
  }
  if (!isNativeIOSAppSync()) return;
  try {
    await LiveActivity.endActivity({ id: orderId, dismissalPolicy: "immediate" });
  } catch {
    /* ignore */
  }
}

export function invalidateLiveActivitySettingsCache(storeId?: string): void {
  if (storeId) settingsCache.delete(storeId);
  else settingsCache.clear();
}
