import { Navigate, Route, Routes } from "react-router-dom";
import SellerLayout from "@/components/seller/SellerLayout.tsx";
import SellerHome from "@/pages/seller/SellerHome.tsx";
import SellerTables from "@/pages/seller/SellerTables.tsx";
import SellerMyOrders from "@/pages/seller/SellerMyOrders.tsx";
import SellerNewOrder from "@/pages/seller/SellerNewOrder.tsx";
import SellerTableDetail from "@/pages/seller/SellerTableDetail.tsx";

export default function SellerRoutes() {
  return (
    <Routes>
      <Route element={<SellerLayout />}>
        <Route index element={<SellerHome />} />
        <Route path="tables" element={<SellerTables />} />
        <Route path="tables/:sessionId" element={<SellerTableDetail />} />
        <Route path="my-orders" element={<SellerMyOrders />} />
        <Route path="new" element={<SellerNewOrder />} />
        <Route path="*" element={<Navigate to="/seller" replace />} />
      </Route>
    </Routes>
  );
}
