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

const INTERNAL_NON_CUSTOMER_PREFIXES = ["/panel", "/admin", "/kds", "/seller", "/delivery", "/kitchen"];

function isExternalTarget(raw: string): boolean {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith("whatsapp:") || trimmed.startsWith("tel:") || trimmed.startsWith("mailto:") || trimmed.startsWith("sms:")) {
    return true;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      if (typeof window !== "undefined" && u.origin === window.location.origin) return false;
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function openExternalTarget(raw: string): Promise<void> {
  const url = raw.trim();
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform?.()) {
      try {
        // @ts-expect-error módulo opcional, resolvido em runtime só se instalado
        const mod = await import("@capacitor/browser");
        if (mod?.Browser?.open) {
          await mod.Browser.open({ url });
          return;
        }
      } catch {
        /* fallback abaixo */
      }
    }
  } catch {
    /* fallback abaixo */
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Toque numa notificação (nativo ou web): actualiza URL e estado do cliente. */
export function navigateCustomerFromPushUrl(raw: string): void {
  if (typeof window === "undefined") return;
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return;

  // 1) Links externos (WhatsApp, tel, mailto, outros domínios) → abrir fora do app cliente.
  if (isExternalTarget(trimmed)) {
    void openExternalTarget(trimmed);
    return;
  }

  const normalized = normalizeCustomerPushUrl(trimmed);
  const target = normalized || "/";

  // 2) Rotas internas fora do fluxo cliente (painel, admin, etc.) → navegação forçada.
  const pathOnly = target.split("?")[0].split("#")[0];
  if (INTERNAL_NON_CUSTOMER_PREFIXES.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`))) {
    window.location.href = target;
    return;
  }

  // 3) Fluxo cliente normal — actualiza URL + dispara evento para o app cliente responder.
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
