import type { Screen, AccountFocus } from "@/contexts/OrderContext";

export const CUSTOMER_PUSH_NAV_EVENT = "kebabturco-customer-push-nav";
const PENDING_COUPON_KEY = "kebabturco-pending-push-coupon";

export type CustomerPushDeepLink = {
  screen: Screen;
  focus?: AccountFocus;
  coupon?: string;
  productId?: string;
};

const VALID_SCREENS = new Set<Screen>([
  "splash",
  "language",
  "storeSelect",
  "orderType",
  "home",
  "product",
  "review",
  "payment",
  "cashPending",
  "confirmation",
  "tracking",
  "account",
]);

const VALID_FOCUS = new Set<AccountFocus>(["orders", "profile", "loyalty"]);

/** Normaliza URL vinda do push (caminho relativo ou URL completa). */
export function normalizeCustomerPushUrl(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "/") return "/";
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      return `${u.pathname || "/"}${u.search}${u.hash}`;
    }
  } catch {
    /* ignore */
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function parseCustomerPushUrl(raw: string): CustomerPushDeepLink | null {
  if (typeof window === "undefined" && !raw.includes("?")) {
    const path = normalizeCustomerPushUrl(raw);
    if (path === "/") return { screen: "home" };
    return null;
  }

  const normalized = normalizeCustomerPushUrl(raw);
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://kebabturco.net";
  let params: URLSearchParams;
  try {
    params = new URL(normalized, base).searchParams;
  } catch {
    return null;
  }

  const screenParam = params.get("screen");
  const screen =
    screenParam && VALID_SCREENS.has(screenParam as Screen)
      ? (screenParam as Screen)
      : null;
  if (!screen) {
    if (normalized === "/" || normalized.startsWith("/?")) return { screen: "home" };
    return null;
  }

  const focusParam = params.get("focus");
  const focus =
    focusParam && VALID_FOCUS.has(focusParam as AccountFocus)
      ? (focusParam as AccountFocus)
      : undefined;

  const coupon = params.get("coupon")?.trim() || undefined;
  const productId = params.get("productId")?.trim() || undefined;

  return { screen, focus, coupon, productId };
}

export function buildCustomerPushUrl(link: CustomerPushDeepLink): string {
  const params = new URLSearchParams();
  params.set("screen", link.screen);
  if (link.focus) params.set("focus", link.focus);
  if (link.coupon) params.set("coupon", link.coupon);
  if (link.productId) params.set("productId", link.productId);
  return `/?${params.toString()}`;
}

export function stashPushCoupon(code: string): void {
  try {
    sessionStorage.setItem(PENDING_COUPON_KEY, code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

export function peekPushCoupon(): string | null {
  try {
    return sessionStorage.getItem(PENDING_COUPON_KEY);
  } catch {
    return null;
  }
}

export function consumePushCoupon(): string | null {
  try {
    const code = sessionStorage.getItem(PENDING_COUPON_KEY);
    if (code) sessionStorage.removeItem(PENDING_COUPON_KEY);
    return code;
  } catch {
    return null;
  }
}

export function applyCustomerPushDeepLink(
  raw: string,
  handlers: {
    setScreen: (s: Screen) => void;
    setAccountFocus: (f: AccountFocus) => void;
    setSelectedProductId?: (id: string | null) => void;
  },
): boolean {
  const parsed = parseCustomerPushUrl(raw);
  if (!parsed) return false;

  if (parsed.coupon) stashPushCoupon(parsed.coupon);
  if (parsed.focus) handlers.setAccountFocus(parsed.focus);
  if (parsed.productId && handlers.setSelectedProductId) {
    handlers.setSelectedProductId(parsed.productId);
  }
  handlers.setScreen(parsed.screen);
  return true;
}

/** Toque numa notificação (nativo ou web): actualiza URL e estado do cliente. */
export function navigateCustomerFromPushUrl(raw: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeCustomerPushUrl(raw);
  const target = normalized || "/";
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current !== target) {
    window.history.pushState(null, "", target);
  }
  window.dispatchEvent(
    new CustomEvent(CUSTOMER_PUSH_NAV_EVENT, { detail: { url: target } }),
  );
}

/** Espelha o servidor — destino por tipo de campanha (pré-visualização no painel). */
export function resolveMarketingPushUrl(input: {
  customPushUrl?: string | null;
  presetKey?: string | null;
  campaignType?: string | null;
  triggerEvent?: string | null;
  couponCode?: string | null;
  linkedProductId?: string | null;
}): string {
  const custom = (input.customPushUrl ?? "").trim();
  if (custom && custom !== "/") return normalizeCustomerPushUrl(custom);

  const preset = (input.presetKey ?? "").trim();
  const type = (input.campaignType ?? "").trim();
  const event = (input.triggerEvent ?? "").trim();
  const coupon = (input.couponCode ?? "").trim();

  if (preset === "loyalty_almost" || type === "loyalty" || event === "loyalty_threshold") {
    return buildCustomerPushUrl({ screen: "account", focus: "loyalty" });
  }
  if (coupon) {
    return buildCustomerPushUrl({ screen: "home", coupon });
  }
  if (input.linkedProductId) {
    return buildCustomerPushUrl({ screen: "product", productId: input.linkedProductId });
  }
  return buildCustomerPushUrl({ screen: "home" });
}
