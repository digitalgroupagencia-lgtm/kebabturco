import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChefHat, CheckCircle, Truck, Bike, RefreshCw, Radio } from "lucide-react";
import { getStatusLabel, type OrderStatus } from "@/lib/orderStatusLabels";
import type { PanelOrder, PanelConnectionStatus } from "./usePanelOrders";

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
  connectionStatus?: PanelConnectionStatus;
  headerExtra?: ReactNode;
}

const connectionLabel: Record<PanelConnectionStatus, { text: string; className: string }> = {
  connecting: { text: "A ligar…", className: "text-muted-foreground" },
  live: { text: "Tempo real", className: "text-success" },
  backup: { text: "Modo reserva", className: "text-amber-600" },
};

const OpsOrdersLayout = ({
  columns,
  orders,
  children,
  onRefresh,
  refreshing,
  connectionStatus = "connecting",
  headerExtra,
}: OpsOrdersLayoutProps) => {
  const countByStatus = (status: OrderStatus) => orders.filter((o) => o.status === status).length;

  return (
    <div className="space-y-4">
      {headerExtra}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Pedidos activos</h2>
        <div className="flex items-center gap-2">
          <span
            className={`hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${connectionLabel[connectionStatus].className}`}
          >
            <Radio className={`h-3 w-3 ${connectionStatus === "live" ? "animate-pulse" : ""}`} />
            {connectionLabel[connectionStatus].text}
          </span>
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
