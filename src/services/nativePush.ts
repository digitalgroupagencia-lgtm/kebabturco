/**
 * Registo de push nativo (FCM Android / APNs iOS) via Capacitor.
 * Só corre dentro do APK; no browser web é no-op (lá usa-se Web Push VAPID).
 *
 * Guarda o token na tabela push_subscriptions com platform='android'|'ios'
 * e customer_phone='__staff__'. A edge function send-push-notification
 * envia via FCM HTTP v1 quando platform != 'web'.
 */
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "native-push-token";

type NativeAvailability = {
  isNative: boolean;
  platform: "android" | "ios" | "web";
};

async function getCapacitorAvailability(): Promise<NativeAvailability> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    const platform = Capacitor.getPlatform() as "android" | "ios" | "web";
    return { isNative: Capacitor.isNativePlatform(), platform };
  } catch {
    return { isNative: false, platform: "web" };
  }
}

export async function isNativePushAvailable(): Promise<boolean> {
  const { isNative, platform } = await getCapacitorAvailability();
  return isNative && (platform === "android" || platform === "ios");
}

async function persistTokenToBackend(token: string, storeId: string, platform: "android" | "ios") {
  try {
    const endpoint = `fcm://${token}`;
    await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint,
          fcm_token: token,
          platform,
          store_id: storeId,
          customer_phone: "__staff__",
          p256dh: null,
          auth: null,
        },
        { onConflict: "endpoint" },
      );
    try { localStorage.setItem(STORAGE_KEY, token); } catch { /* ignore */ }
  } catch (e) {
    console.warn("[nativePush] persistTokenToBackend falhou", e);
  }
}

/** Pedir permissão + registar token FCM/APNs. Idempotente. */
export async function registerNativeStaffPush(storeId: string): Promise<{
  ok: boolean;
  reason?: string;
  token?: string;
}> {
  const { isNative, platform } = await getCapacitorAvailability();
  if (!isNative || platform === "web") return { ok: false, reason: "not-native" };

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let granted = perm.receive === "granted";
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) return { ok: false, reason: "denied" };

    return await new Promise(async (resolve) => {
      const onReg = await PushNotifications.addListener("registration", async (t) => {
        await persistTokenToBackend(t.value, storeId, platform as "android" | "ios");
        onReg.remove();
        onErr.remove();
        resolve({ ok: true, token: t.value });
      });
      const onErr = await PushNotifications.addListener("registrationError", (err) => {
        onReg.remove();
        onErr.remove();
        resolve({ ok: false, reason: String(err?.error ?? "register-error") });
      });

      // Notificações em foreground — apenas log; o KDS já tem som/vibração próprios.
      await PushNotifications.addListener("pushNotificationReceived", (n) => {
        console.log("[nativePush] foreground push", n);
      });
      await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
        const url = (a?.notification?.data as { url?: string })?.url;
        if (url && typeof window !== "undefined") {
          window.location.hash = "";
          window.location.assign(url);
        }
      });

      await PushNotifications.register();
    });
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Para usar no boot do painel — re-regista se já estava ativo. */
export async function restoreNativeStaffPushIfPossible(storeId: string): Promise<void> {
  if (!(await isNativePushAvailable())) return;
  await registerNativeStaffPush(storeId);
}

/** Mantém ecrã do tablet ligado enquanto painel operacional está aberto. */
export async function enableKeepAwake(): Promise<void> {
  try {
    const { isNative } = await getCapacitorAvailability();
    if (isNative) {
      const { KeepAwake } = await import("@capacitor-community/keep-awake");
      await KeepAwake.keepAwake();
      return;
    }
  } catch { /* ignore */ }

  // Fallback browser: Screen Wake Lock API
  try {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<unknown> } })
        .wakeLock.request("screen")
        .catch(() => null);
    }
  } catch { /* ignore */ }
}

export async function disableKeepAwake(): Promise<void> {
  try {
    const { isNative } = await getCapacitorAvailability();
    if (isNative) {
      const { KeepAwake } = await import("@capacitor-community/keep-awake");
      await KeepAwake.allowSleep();
    }
  } catch { /* ignore */ }
}
