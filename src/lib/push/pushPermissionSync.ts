import { getNativePushPermission, isNativePushAvailable } from "@/services/nativePush";

export type EffectivePushPermission = "granted" | "denied" | "prompt" | "unsupported";

/** Estado real das notificações no telemóvel ou browser (não o interruptor guardado na app). */
export async function getEffectivePushPermission(): Promise<EffectivePushPermission> {
  if (await isNativePushAvailable()) {
    const native = await getNativePushPermission();
    if (native === "granted" || native === "denied" || native === "prompt") return native;
    return "prompt";
  }
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "prompt";
}

/** Alinha preferências guardadas na app com o que o sistema permite agora. */
export async function syncStaffPushPreferenceWithOs(): Promise<EffectivePushPermission> {
  const perm = await getEffectivePushPermission();
  if (perm !== "granted") {
    const { setStaffPushEnabled } = await import("@/lib/staffPush");
    setStaffPushEnabled(false);
    clearStaffPushPromptSession();
  }
  return perm;
}

export async function syncCustomerMarketingPushPreferenceWithOs(): Promise<EffectivePushPermission> {
  const perm = await getEffectivePushPermission();
  if (perm !== "granted") {
    const { setCustomerMarketingPushOpted } = await import("@/lib/customerMarketingPush");
    setCustomerMarketingPushOpted(false);
    clearCustomerMarketingPromptSession();
  }
  return perm;
}

export function clearStaffPushPromptSession(): void {
  try {
    sessionStorage.removeItem("staff-push-prompt-shown");
  } catch {
    /* ignore */
  }
}

export function clearCustomerMarketingPromptSession(): void {
  try {
    sessionStorage.removeItem("customer-marketing-prompt-shown");
  } catch {
    /* ignore */
  }
}

/** Mostrar pedido de activação da equipa/admin se ainda não está tudo activo. */
export async function shouldPromptStaffPushAsync(): Promise<boolean> {
  const { isStaffPushSupported, isStaffPushEnabled } = await import("@/lib/staffPush");
  if (!isStaffPushSupported()) return false;

  const perm = await syncStaffPushPreferenceWithOs();
  if (perm === "unsupported") return false;
  if (perm === "granted" && isStaffPushEnabled()) return false;
  return true;
}

/** Mostrar pedido de activação no menu cliente se ainda não está tudo activo. */
export async function shouldPromptCustomerMarketingPushAsync(): Promise<boolean> {
  const { isCustomerMarketingPushSupportedAsync, isCustomerMarketingPushOpted } = await import(
    "@/lib/customerMarketingPush"
  );
  if (!(await isCustomerMarketingPushSupportedAsync())) return false;

  const perm = await syncCustomerMarketingPushPreferenceWithOs();
  if (perm === "unsupported") return false;
  if (perm === "granted" && isCustomerMarketingPushOpted()) return false;
  return true;
}
