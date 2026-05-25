/** Configuração vendedor — sem elementos Route (evita o scanner Lovable). */
export const SELLER_ROUTE_LOADERS = [
  { path: "/seller", module: () => import("@/views/seller/SellerHome.tsx") },
  { path: "/seller/tables", module: () => import("@/views/seller/SellerTables.tsx") },
  { path: "/seller/tables/:sessionId", module: () => import("@/views/seller/SellerTableDetail.tsx") },
  { path: "/seller/my-orders", module: () => import("@/views/seller/SellerMyOrders.tsx") },
  { path: "/seller/new", module: () => import("@/views/seller/SellerNewOrder.tsx") },
] as const;
