/** Lê a subscrição push activa neste browser (se existir). */
export async function getLocalPushSubscription(): Promise<{
  endpoint: string;
  p256dh: string;
  auth: string;
} | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return null;

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;

    return {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    };
  } catch {
    return null;
  }
}

export function describePushAudienceTag(tag: string | null | undefined): string {
  if (!tag || tag.trim() === "") return "Equipa (legado)";
  if (tag === "__marketing__") return "Cliente (promoções)";
  if (tag === "__staff__") return "Equipa (painel)";
  return tag;
}
