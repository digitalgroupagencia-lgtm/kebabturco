export type CustomerOrderScreen = "confirmation" | "tracking" | "cashPending";

/** Mantém ?order= e ?screen= na URL para o cliente recuperar o pedido após refresh. */
export function syncActiveOrderUrl(orderId: string | null, screen?: CustomerOrderScreen | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const currentScreen = url.searchParams.get("screen");
  if (orderId) {
    url.searchParams.set("order", orderId);
    if (screen) url.searchParams.set("screen", screen);
  } else {
    url.searchParams.delete("order");
    // Não apagar ecrãs normais do cliente/preview (ex.: ?screen=language).
    // Antes isto removia o screen, o PreviewGate colocava de novo e a página ficava a piscar.
    if (currentScreen === "confirmation" || currentScreen === "tracking" || currentScreen === "cashPending") {
      url.searchParams.delete("screen");
    }
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
    window.history.replaceState({}, "", next);
  }
}

export function readOrderIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("order");
}

export function readCustomerScreenFromUrl(): CustomerOrderScreen | null {
  if (typeof window === "undefined") return null;
  const s = new URLSearchParams(window.location.search).get("screen");
  return s === "confirmation" || s === "tracking" || s === "cashPending" ? s : null;
}

const CUSTOMER_ACK_PREFIX = "kiosk-order-ack-";

export function hasCustomerAcknowledged(orderId: string): boolean {
  try {
    return localStorage.getItem(`${CUSTOMER_ACK_PREFIX}${orderId}`) === "1";
  } catch {
    return false;
  }
}

export function markCustomerAcknowledged(orderId: string) {
  try {
    localStorage.setItem(`${CUSTOMER_ACK_PREFIX}${orderId}`, "1");
  } catch {
    /* ignore */
  }
}
