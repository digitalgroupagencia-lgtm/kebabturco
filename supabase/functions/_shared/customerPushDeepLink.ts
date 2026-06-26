/** Destino ao tocar numa notificação de marketing — espelha src/lib/customerPushDeepLink.ts */

export function buildCustomerPushPath(params: {
  screen: string;
  focus?: string;
  coupon?: string;
  productId?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("screen", params.screen);
  if (params.focus) sp.set("focus", params.focus);
  if (params.coupon) sp.set("coupon", params.coupon);
  if (params.productId) sp.set("productId", params.productId);
  return `/?${sp.toString()}`;
}

export function resolveMarketingPushUrl(input: {
  customPushUrl?: string | null;
  presetKey?: string | null;
  campaignType?: string | null;
  triggerEvent?: string | null;
  couponCode?: string | null;
  linkedProductId?: string | null;
}): string {
  const custom = (input.customPushUrl ?? "").trim();
  if (custom && custom !== "/") return custom;

  const preset = (input.presetKey ?? "").trim();
  const type = (input.campaignType ?? "").trim();
  const event = (input.triggerEvent ?? "").trim();
  const coupon = (input.couponCode ?? "").trim();

  if (
    preset === "loyalty_almost" ||
    type === "loyalty" ||
    event === "loyalty_threshold"
  ) {
    return buildCustomerPushPath({ screen: "account", focus: "loyalty" });
  }

  if (coupon) {
    return buildCustomerPushPath({ screen: "home", coupon });
  }

  if (input.linkedProductId) {
    return buildCustomerPushPath({
      screen: "product",
      productId: input.linkedProductId,
    });
  }

  if (
    preset.startsWith("winback") ||
    type === "winback" ||
    preset.startsWith("promo_") ||
    type === "promo"
  ) {
    return buildCustomerPushPath({ screen: "home" });
  }

  if (event === "lifecycle_welcome" || preset.startsWith("welcome")) {
    return buildCustomerPushPath({ screen: "home" });
  }

  if (event === "lifecycle_relation") {
    return buildCustomerPushPath({ screen: "home" });
  }

  if (preset === "new_subscriber" || event === "new_subscriber") {
    return buildCustomerPushPath({ screen: "home" });
  }

  if (event === "first_order" || event === "inactive") {
    return buildCustomerPushPath({ screen: "home" });
  }

  if (event === "store_open") {
    return buildCustomerPushPath({ screen: "home" });
  }

  return buildCustomerPushPath({ screen: "home" });
}
