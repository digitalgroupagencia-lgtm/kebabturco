import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin, XCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { getNextAction } from "@/lib/orderStatusLabels";
import type { PanelOrder, OrderStatus } from "./usePanelOrders";

type OrderItem = Tables<"order_items">;

const statusCardClass: Record<string, string> = {
  pending: "bg-red-500/15 border-red-500 ring-1 ring-red-500/30 animate-pulse",
  preparing: "bg-yellow-500/15 border-yellow-400",
  ready: "bg-green-500/15 border-green-500",
  out_for_delivery: "bg-blue-500/15 border-blue-500",
  delivered: "bg-muted/80 border-muted-foreground/20 opacity-75",
  cancelled: "bg-destructive/10 border-destructive/30",
};

function getSourceLabel(source: string) {
  const map: Record<string, string> = { totem: "App", ifood: "iFood", counter: "Balcão", delivery: "Delivery", waiter: "Garçon" };
  return map[source] || source;
}

interface OpsOrderCardProps {
  order: PanelOrder;
  items: OrderItem[];
  onAdvance: (order: PanelOrder, status: OrderStatus) => void;
  onCancel: (orderId: string) => void;
}

const OpsOrderCard = ({ order, items, onAdvance, onCancel }: OpsOrderCardProps) => {
  const isTable = order.order_type === "dine_in" && order.table_number;
  const next = getNextAction(order.status, order.order_type);
  const cardClass = statusCardClass[order.status] || "border-border";

  return (
    <Card className={`overflow-hidden border-2 ${cardClass}`}>
      <CardContent className="p-4 space-y-3">
        {isTable && (
          <p className="text-3xl font-black text-primary leading-none text-center py-1">
            Mesa {order.table_number}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="font-black text-xl">#{order.order_number}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">{getSourceLabel(order.source || "totem")}</Badge>
          <Badge variant="outline">
            {order.order_type === "delivery" ? "Delivery" : order.order_type === "takeaway" ? "Takeaway" : "Mesa"}
          </Badge>
          {(order as PanelOrder & { payment_status?: string }).payment_status === "paid" && (
            <Badge className="bg-green-600">Pago</Badge>
          )}
        </div>
        {order.customer_name && (
          <div className="flex items-center gap-1.5 text-sm">
            <User className="w-3.5 h-3.5" />
            {order.customer_name}
          </div>
        )}
        {order.customer_phone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5" />
            {order.customer_phone}
          </div>
        )}
        {order.delivery_street && (
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {order.delivery_street} {order.delivery_number}, {order.delivery_city}
            </span>
          </div>
        )}
        <ul className="text-xs space-y-1 border-t pt-2 max-h-28 overflow-y-auto">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2">
              <span className="truncate">
                {it.quantity}x {it.product_name}
              </span>
              <span className="font-bold shrink-0">€{Number(it.total_price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between font-black text-lg text-primary">
          <span>Total</span>
          <span>€ {Number(order.total).toFixed(2)}</span>
        </div>
        {next && (
          <Button
            size="lg"
            className="w-full h-12 font-black text-base touch-action-manipulation"
            onClick={() => onAdvance(order, next.next)}
          >
            {next.label}
          </Button>
        )}
        {order.status === "pending" && (
          <Button
            size="sm"
            variant="destructive"
            className="w-full touch-action-manipulation"
            onClick={() => onCancel(order.id)}
          >
            <XCircle className="h-4 w-4 mr-1" /> Cancelar
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default OpsOrderCard;
