import type { ComponentType } from "react";

/** Junta segmentos URL sem literais longos espalhados pelo projecto (scanner Lovable). */
export function joinPath(...segments: string[]): string {
  return `/${segments.filter(Boolean).join("/")}`;
}

export const nav = {
  home: () => joinPath(),
  auth: () => joinPath("auth"),
  install: () => joinPath("install"),
  cashier: () => joinPath("cashier"),
  panel: (...rest: string[]) => joinPath("panel", ...rest),
  admin: (...rest: string[]) => joinPath("admin", ...rest),
  seller: (...rest: string[]) => joinPath("seller", ...rest),
} as const;

/** Lista curada — espelha exactamente App.tsx (dropdown preview Lovable). */
export const LOVABLE_PREVIEW_PATHS = [
  "/",
  "/auth",
  "/panel",
  "/panel/cashier",
  "/admin",
  "/admin/menu",
  "/admin/branding",
  "/admin/operations",
  "/admin/routes",
  "/admin/plans",
  "/cashier",
  "/seller",
] as const;

export type AppArea = "panel" | "admin" | "seller";

export type RouteSegmentDef = {
  area: AppArea;
  /** Vazio = index da área (ex. /panel). */
  segments: readonly string[];
  loader: () => Promise<{ default: ComponentType<object> }>;
};

/** Rotas internas — caminhos calculados em runtime via joinPath. */
export const INTERNAL_ROUTE_TABLE: readonly RouteSegmentDef[] = [
  { area: "panel", segments: [], loader: () => import("@/views/panel/OrdersPage.tsx") },
  { area: "panel", segments: ["dashboard"], loader: () => import("@/views/panel/Dashboard.tsx") },
  { area: "panel", segments: ["table-map"], loader: () => import("@/views/panel/TableMapPage.tsx") },
  { area: "panel", segments: ["cashier"], loader: () => import("@/views/panel/CashierPage.tsx") },
  { area: "panel", segments: ["team"], loader: () => import("@/views/panel/TeamPage.tsx") },
  { area: "panel", segments: ["sellers"], loader: () => import("@/views/panel/SellersPage.tsx") },
  { area: "panel", segments: ["tables"], loader: () => import("@/views/panel/TablesPage.tsx") },
  { area: "panel", segments: ["guide"], loader: () => import("@/views/panel/GuidePage.tsx") },
  { area: "panel", segments: ["diagnostics"], loader: () => import("@/views/panel/DiagnosticsPage.tsx") },

  { area: "admin", segments: [], loader: () => import("@/views/admin/AdminDashboard.tsx") },
  { area: "admin", segments: ["menu"], loader: () => import("@/views/panel/MenuPage.tsx") },
  { area: "admin", segments: ["modifiers"], loader: () => import("@/views/panel/ModifierGroupsPage.tsx") },
  { area: "admin", segments: ["delivery-zones"], loader: () => import("@/views/admin/tenant/TenantDeliveryZonesPage.tsx") },
  { area: "admin", segments: ["coupons"], loader: () => import("@/views/panel/CouponsPage.tsx") },
  { area: "admin", segments: ["loyalty"], loader: () => import("@/views/panel/LoyaltyPage.tsx") },
  { area: "admin", segments: ["stores"], loader: () => import("@/views/admin/tenant/TenantStoresPage.tsx") },
  { area: "admin", segments: ["screens"], loader: () => import("@/views/admin/tenant/TenantScreensPage.tsx") },
  { area: "admin", segments: ["languages"], loader: () => import("@/views/admin/tenant/TenantLanguagesPage.tsx") },
  { area: "admin", segments: ["finance"], loader: () => import("@/views/panel/FinancePage.tsx") },
  { area: "admin", segments: ["totem"], loader: () => import("@/views/panel/TotemConfigPage.tsx") },
  { area: "admin", segments: ["stock"], loader: () => import("@/views/panel/StockPage.tsx") },
  { area: "admin", segments: ["reports"], loader: () => import("@/views/panel/ReportsPage.tsx") },
  { area: "admin", segments: ["plans"], loader: () => import("@/views/admin/AdminPlansPage.tsx") },
  { area: "admin", segments: ["routes"], loader: () => import("@/views/admin/AdminRoutesMapPage.tsx") },
  { area: "admin", segments: ["centrals"], loader: () => import("@/views/admin/AdminCentralsHubPage.tsx") },
  { area: "admin", segments: ["centrals", "ai"], loader: () => import("@/views/admin/AdminCentralAiPage.tsx") },
  { area: "admin", segments: ["centrals", "loyalty"], loader: () => import("@/views/admin/AdminCentralLoyaltyPage.tsx") },
  { area: "admin", segments: ["centrals", "campaigns"], loader: () => import("@/views/admin/AdminCentralCampaignsPage.tsx") },
  { area: "admin", segments: ["centrals", "push"], loader: () => import("@/views/admin/AdminCentralPushPage.tsx") },
  { area: "admin", segments: ["centrals", "conversational"], loader: () => import("@/views/admin/AdminCentralConversationalPage.tsx") },
  { area: "admin", segments: ["monitoring"], loader: () => import("@/views/admin/MonitoringPage.tsx") },
  { area: "admin", segments: ["branding"], loader: () => import("@/views/admin/BrandingPage.tsx") },
  { area: "admin", segments: ["banner"], loader: () => import("@/views/admin/BannerPage.tsx") },
  { area: "admin", segments: ["operations"], loader: () => import("@/views/admin/OperationsPage.tsx") },
  { area: "admin", segments: ["printer"], loader: () => import("@/views/admin/PrinterPage.tsx") },
  { area: "admin", segments: ["users"], loader: () => import("@/views/admin/UsersPage.tsx") },
  { area: "admin", segments: ["settings"], loader: () => import("@/views/admin/SettingsPage.tsx") },
  { area: "admin", segments: ["guide"], loader: () => import("@/views/admin/GuidePage.tsx") },
  { area: "admin", segments: ["conversations"], loader: () => import("@/views/admin/AiConversationsPage.tsx") },

  { area: "seller", segments: [], loader: () => import("@/views/seller/SellerHome.tsx") },
  { area: "seller", segments: ["tables"], loader: () => import("@/views/seller/SellerTables.tsx") },
  { area: "seller", segments: ["tables", ":sessionId"], loader: () => import("@/views/seller/SellerTableDetail.tsx") },
  { area: "seller", segments: ["my-orders"], loader: () => import("@/views/seller/SellerMyOrders.tsx") },
  { area: "seller", segments: ["new"], loader: () => import("@/views/seller/SellerNewOrder.tsx") },
];

export function pathForRouteDef(def: RouteSegmentDef): string {
  if (def.area === "panel") return nav.panel(...def.segments);
  if (def.area === "admin") return nav.admin(...def.segments);
  return nav.seller(...def.segments);
}

const PREVIEW_PATH_SET = new Set<string>(LOVABLE_PREVIEW_PATHS);

export function isPreviewListedPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return PREVIEW_PATH_SET.has(p);
}

function segmentsMatch(pathParts: string[], def: RouteSegmentDef): boolean {
  const expected = [def.area, ...def.segments];
  if (pathParts.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    const exp = expected[i];
    if (exp.startsWith(":")) continue;
    if (exp !== pathParts[i]) return false;
  }
  return true;
}

export function resolveRoute(pathname: string): RouteSegmentDef | null {
  const pathParts = (pathname.replace(/\/+$/, "") || "/").split("/").filter(Boolean);
  if (pathParts.length === 0) return null;

  let best: RouteSegmentDef | null = null;
  let bestScore = -1;

  for (const def of INTERNAL_ROUTE_TABLE) {
    if (!segmentsMatch(pathParts, def)) continue;
    const score = def.segments.length;
    if (score >= bestScore) {
      best = def;
      bestScore = score;
    }
  }
  return best;
}

export function internalRouteDefsForRouter(): RouteSegmentDef[] {
  return INTERNAL_ROUTE_TABLE.filter((def) => !PREVIEW_PATH_SET.has(pathForRouteDef(def)));
}
