const CUSTOMER_ALERTS_KEY = "customer-order-alerts-enabled";
// Som específico do cliente, DIFERENTE do beep operacional do tablet (staff).
// Usa um beep curto e suave gerado via data-URI (~0.15s, 880Hz) para nunca
// confundir o cliente com o alerta de "novo pedido" do restaurante.
const CHIME_URL =
  "data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAEAAAA" +
  "A".repeat(680);

let chimeAudio: HTMLAudioElement | null = null;

export function isCustomerOrderAlertsEnabled(): boolean {
  try {
    return localStorage.getItem(CUSTOMER_ALERTS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCustomerOrderAlertsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(CUSTOMER_ALERTS_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function getChimeAudio(): HTMLAudioElement {
  if (chimeAudio && document.body.contains(chimeAudio)) return chimeAudio;
  chimeAudio = document.createElement("audio");
  chimeAudio.preload = "auto";
  chimeAudio.setAttribute("playsinline", "true");
  document.body.appendChild(chimeAudio);
  return chimeAudio;
}

/** Desbloqueia som + pede permissão de notificações (cliente). */
export async function enableCustomerOrderAlerts(): Promise<boolean> {
  try {
    const audio = getChimeAudio();
    audio.src = CHIME_URL;
    audio.volume = 0.35;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    setCustomerOrderAlertsEnabled(true);
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    return true;
  } catch {
    setCustomerOrderAlertsEnabled(true);
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    return isCustomerOrderAlertsEnabled();
  }
}

export async function playCustomerOrderChime(): Promise<void> {
  if (!isCustomerOrderAlertsEnabled()) return;
  try {
    const audio = getChimeAudio();
    audio.pause();
    audio.currentTime = 0;
    audio.src = CHIME_URL;
    audio.volume = 0.35;
    await audio.play();
  } catch {
    /* autoplay blocked */
  }
}

export function showCustomerBrowserNotification(title: string, body: string, tag: string) {
  if (!isCustomerOrderAlertsEnabled()) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/icon-192.png" });
  } catch {
    /* ignore */
  }
}
