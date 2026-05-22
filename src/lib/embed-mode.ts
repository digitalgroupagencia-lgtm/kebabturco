type Lang = "pt" | "en" | "es" | "fr";

const VALID_LANGS: Lang[] = ["pt", "en", "es", "fr"];

export function readEmbedParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function isEmbedded(): boolean {
  const params = readEmbedParams();
  return params.get("embedded") === "1" || params.get("embed") === "1";
}

export function isGandiaFoodSource(): boolean {
  const params = readEmbedParams();
  return params.get("source") === "gandiafood";
}

export function shouldHideHeader(): boolean {
  const params = readEmbedParams();
  if (params.get("hideHeader") === "1") return true;
  return isEmbedded();
}

export function shouldForceDeliveryOnly(): boolean {
  return isGandiaFoodSource();
}

export function getEmbedLang(): Lang | null {
  const raw = readEmbedParams().get("lang");
  if (raw && VALID_LANGS.includes(raw as Lang)) return raw as Lang;
  return null;
}

export function getEmbedScreen():
  | "splash"
  | "language"
  | "storeSelect"
  | "orderType"
  | "home"
  | "product"
  | "review"
  | "payment"
  | "confirmation"
  | null {
  const params = readEmbedParams();
  if (params.get("skipWelcome") === "1" || params.get("welcome") === "0") return "home";
  if (isGandiaFoodSource()) return "home";
  const screen = params.get("screen");
  const valid = ["splash", "language", "storeSelect", "orderType", "home", "product", "review", "payment", "confirmation"];
  return valid.includes(screen || "") ? (screen as any) : null;
}
