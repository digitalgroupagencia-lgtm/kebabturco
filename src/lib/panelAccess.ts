import { nav } from "@/lib/navPaths.ts";

/** Segmentos permitidos no painel operacional do restaurante (/panel). */
export const PANEL_OPERATIONAL_SEGMENTS = new Set([
  "",
  "dashboard",
  "cashier",
  "table-map",
  "tables",
  "team",
  "sellers",
  "guide",
  "diagnostics",
]);

/** Configuração do projecto — bloqueada em /panel; redirecciona para /admin. */
export const PANEL_CONFIG_SEGMENT_TO_ADMIN: Readonly<Record<string, readonly string[]>> = {
  menu: ["menu"],
  modifiers: ["modifiers"],
  banners: ["banner"],
  "delivery-zones": ["delivery-zones"],
  coupons: ["coupons"],
  loyalty: ["loyalty"],
  branding: ["branding"],
  stores: ["stores"],
  screens: ["screens"],
  languages: ["languages"],
  finance: ["finance"],
  payments: ["operations"],
  printers: ["printer"],
  totem: ["totem"],
  settings: ["settings"],
  stock: ["stock"],
  reports: ["reports"],
  orders: [],
};

export function panelSegmentFromPathname(pathname: string): string {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "panel") return "";
  return parts[1] ?? "";
}

export function isPanelOperationalPath(pathname: string): boolean {
  return isPanelOperationalSegment(panelSegmentFromPathname(pathname));
}

export function isPanelOperationalSegment(segment: string): boolean {
  return PANEL_OPERATIONAL_SEGMENTS.has(segment);
}

export function isPanelConfigSegment(segment: string): boolean {
  return segment in PANEL_CONFIG_SEGMENT_TO_ADMIN;
}

/** Destino em /admin quando alguém abre configuração via /panel/... */
export function adminPathForPanelConfig(segment: string): string {
  const adminSegments = PANEL_CONFIG_SEGMENT_TO_ADMIN[segment];
  if (!adminSegments) return nav.admin();
  if (adminSegments.length === 0) return nav.panel();
  return nav.admin(...adminSegments);
}

export function redirectTargetForPanelPath(
  pathname: string,
  role: string | null | undefined,
): string | null {
  const segment = panelSegmentFromPathname(pathname);
  if (isPanelOperationalSegment(segment)) return null;

  if (role === "admin_master" && isPanelConfigSegment(segment)) {
    return adminPathForPanelConfig(segment);
  }

  if (segment && !isPanelOperationalSegment(segment)) {
    return nav.panel();
  }

  return null;
}

export const RESTAURANT_PANEL_ROLES = new Set([
  "restaurant_admin",
  "operator",
  "kitchen",
]);

export function canUseRestaurantPanel(role: string | null | undefined): boolean {
  if (!role) return false;
  return RESTAURANT_PANEL_ROLES.has(role) || role === "admin_master";
}

export function legacyBareSegmentTarget(segment: string): string | null {
  if (isPanelConfigSegment(segment)) return adminPathForPanelConfig(segment);
  if (isPanelOperationalSegment(segment)) {
    return segment ? nav.panel(segment) : nav.panel();
  }
  return null;
}
