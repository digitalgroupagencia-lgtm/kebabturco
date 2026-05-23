import { useRoutes } from "react-router-dom";
import SellerLayout from "@/components/seller/SellerLayout.tsx";
import SellerHome from "@/pages/seller/SellerHome.tsx";
import SellerTables from "@/pages/seller/SellerTables.tsx";
import SellerMyOrders from "@/pages/seller/SellerMyOrders.tsx";
import SellerNewOrder from "@/pages/seller/SellerNewOrder.tsx";
import SellerTableDetail from "@/pages/seller/SellerTableDetail.tsx";

const sellerRouteTree = [
  {
    path: "/",
    element: <SellerLayout />,
    children: [
      { index: true, element: <SellerHome /> },
      { path: "tables", element: <SellerTables /> },
      { path: "tables/:sessionId", element: <SellerTableDetail /> },
      { path: "my-orders", element: <SellerMyOrders /> },
      { path: "new", element: <SellerNewOrder /> },
    ],
  },
];

export default function SellerRoutes() {
  return useRoutes(sellerRouteTree);
}
