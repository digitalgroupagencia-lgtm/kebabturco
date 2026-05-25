/** Configuração vendedor — sem elementos Route (evita o scanner Lovable). */
export const SELLER_ROUTE_LOADERS = [
  { path: "/seller", module: () => import("@/pages/seller/SellerHome.tsx") },
  { path: "/seller/tables", module: () => import("@/pages/seller/SellerTables.tsx") },
  { path: "/seller/tables/:sessionId", module: () => import("@/pages/seller/SellerTableDetail.tsx") },
  { path: "/seller/my-orders", module: () => import("@/pages/seller/SellerMyOrders.tsx") },
  { path: "/seller/new", module: () => import("@/pages/seller/SellerNewOrder.tsx") },
] as const;
