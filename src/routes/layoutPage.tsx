import type { ComponentType, ReactNode } from "react";
import PanelLayout from "@/components/panel/PanelLayout.tsx";
import AdminLayout from "@/components/admin/AdminLayout.tsx";
import SellerLayout from "@/components/seller/SellerLayout.tsx";

type PageComponent = ComponentType<object>;

export function panelPage(page: PageComponent): ReactNode {
  return <PanelLayout page={page} />;
}

export function adminPage(page: PageComponent): ReactNode {
  return <AdminLayout page={page} />;
}

export function sellerPage(page: PageComponent): ReactNode {
  return <SellerLayout page={page} />;
}
