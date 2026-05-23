import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChefHat, CheckCircle, Truck, Bike, RefreshCw } from "lucide-react";
import { getStatusLabel, type OrderStatus } from "@/lib/orderStatusLabels";
import type { PanelOrder } from "./usePanelOrders";

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: ChefHat,
  ready: CheckCircle,
  out_for_delivery: Bike,
  delivered: Truck,
};

interface OpsOrdersLayoutProps {
  columns: OrderStatus[];
  orders: PanelOrder[];
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const OpsOrdersLayout = ({ columns, orders, children, onRefresh, refreshing }: OpsOrdersLayoutProps) => {
  const countByStatus = (status: OrderStatus) => orders.filter((o) => o.status === status).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Pedidos activos</h2>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground hidden sm:block">Actualização automática</p>
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 touch-action-manipulation"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          )}
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-5 gap-3">
        {columns.map((status) => {
          const Icon = statusIcons[status] || Clock;
          return (
            <Card key={status}>
              <CardContent className="p-3">
                <p className="text-2xl font-bold">{countByStatus(status)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Icon className="w-3 h-3" /> {getStatusLabel(status)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {children}
    </div>
  );
};

export default OpsOrdersLayout;
