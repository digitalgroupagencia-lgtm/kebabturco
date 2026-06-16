/**
 * Registo de push nativo (FCM Android / APNs iOS) via Capacitor.
 * Só corre dentro do APK; no browser web usa-se Web Push VAPID.
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
  const { error } = await supabase.rpc("register_native_push_subscription", {
    _store_id: storeId,
    _fcm_token: token,
    _platform: platform,
    _customer_phone: "__staff__",
  });
  if (error) throw error;
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* ignore */
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
        try {
          await persistTokenToBackend(t.value, storeId, platform as "android" | "ios");
          onReg.remove();
          onErr.remove();
          resolve({ ok: true, token: t.value });
        } catch (e) {
          onReg.remove();
          onErr.remove();
          resolve({
            ok: false,
            reason: e instanceof Error ? e.message : String(e),
          });
        }
      });
      const onErr = await PushNotifications.addListener("registrationError", (err) => {
        onReg.remove();
        onErr.remove();
        resolve({ ok: false, reason: String(err?.error ?? "register-error") });
      });

      await PushNotifications.addListener("pushNotificationReceived", () => {
        /* som local do painel cobre foreground */
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
  } catch {
    /* ignore */
  }

  try {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<unknown> } })
        .wakeLock.request("screen")
        .catch(() => null);
    }
  } catch {
    /* ignore */
  }
}

export async function disableKeepAwake(): Promise<void> {
  try {
    const { isNative } = await getCapacitorAvailability();
    if (isNative) {
      const { KeepAwake } = await import("@capacitor-community/keep-awake");
      await KeepAwake.allowSleep();
    }
  } catch {
    /* ignore */
  }
}
