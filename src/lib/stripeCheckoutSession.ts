const SESSION_KEY = "stripe-checkout-pending-v1";

export type StripeCheckoutSession = {
  storeId: string;
  paymentIntentId: string;
  orderId: string;
  orderNumber: string;
  checkoutMethod: "card" | "bizum";
  amountCents: number;
  restaurantPortionCents: number;
  createdAt: string;
};

export function saveStripeCheckoutSession(session: StripeCheckoutSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function loadStripeCheckoutSession(): StripeCheckoutSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StripeCheckoutSession;
    if (!parsed?.paymentIntentId || !parsed?.orderId || !parsed?.storeId) return null;
    const ageMs = Date.now() - new Date(parsed.createdAt).getTime();
    if (ageMs > 2 * 60 * 60 * 1000) {
      clearStripeCheckoutSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearStripeCheckoutSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function readStripeRedirectFromUrl(): {
  paymentIntentId: string | null;
  clientSecret: string | null;
  redirectStatus: string | null;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      paymentIntentId: params.get("payment_intent"),
      clientSecret: params.get("payment_intent_client_secret"),
      redirectStatus: params.get("redirect_status"),
    };
  } catch {
    return { paymentIntentId: null, clientSecret: null, redirectStatus: null };
  }
}

export function clearStripeRedirectParams() {
  try {
    const url = new URL(window.location.href);
    const keys = [
      "payment_intent",
      "payment_intent_client_secret",
      "redirect_status",
      "setup_intent",
      "setup_intent_client_secret",
    ];
    let changed = false;
    for (const key of keys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    /* ignore */
  }
}
