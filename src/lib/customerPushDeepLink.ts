const PENDING_COUPON_KEY = "customer-pending-push-coupon";

export function consumePushCoupon(): string | null {
  try {
    const value = sessionStorage.getItem(PENDING_COUPON_KEY);
    if (value) sessionStorage.removeItem(PENDING_COUPON_KEY);
    return value;
  } catch {
    return null;
  }
}

export function setPendingPushCoupon(code: string): void {
  try {
    sessionStorage.setItem(PENDING_COUPON_KEY, code);
  } catch {
    /* ignore */
  }
}

/** Navega o cliente para o URL recebido via push notification. */
export function navigateCustomerFromPushUrl(url: string | null | undefined): void {
  if (!url || typeof window === "undefined") return;
  try {
    const parsed = new URL(url, window.location.origin);
    const coupon = parsed.searchParams.get("coupon");
    if (coupon) setPendingPushCoupon(coupon);
    if (parsed.origin === window.location.origin) {
      window.location.assign(parsed.pathname + parsed.search + parsed.hash);
    } else {
      window.location.href = url;
    }
  } catch {
    /* ignore */
  }
}
