/**
 * Lazy imports das páginas, sem `<Route path>` (scanner Lovable lê App.tsx).
 */
import { lazy } from "react";

export const Index = lazy(() => import("@/customer/Index.tsx"));
export const StaffAuthRedirect = lazy(() => import("@/pages/StaffAuthRedirect.tsx"));
export const StaffLogin = lazy(() => import("@/components/staff/StaffEmailLoginScreen.tsx"));
export const NotFound = lazy(() => import("@/pages/NotFound.tsx"));

export const OrdersPage = lazy(() => import("@/views/panel/OrdersPage.tsx"));
export const CashierPage = lazy(() => import("@/views/panel/CashierPage.tsx"));

export const MenuPage = lazy(() => import("@/views/panel/MenuPage.tsx"));
export const BrandingPage = lazy(() => import("@/views/admin/BrandingPage.tsx"));
export const OperationsPage = lazy(() => import("@/views/admin/OperationsPage.tsx"));

export const AdminDashboard = lazy(() => import("@/views/admin/AdminDashboard.tsx"));
export const AdminRoutesMapPage = lazy(() => import("@/views/admin/AdminRoutesMapPage.tsx"));
export const AdminPlansPage = lazy(() => import("@/views/admin/AdminPlansPage.tsx"));

export const SellerHome = lazy(() => import("@/views/seller/SellerHome.tsx"));
