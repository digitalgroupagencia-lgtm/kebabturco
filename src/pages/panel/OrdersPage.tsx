import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, ChefHat, CheckCircle, Truck, XCircle, RefreshCw } from "lucide-react";
import type { Tables, Database } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType; next?: OrderStatus }> = {
  pending: { label: "Novo", color: "bg-amber-500", icon: Clock, next: "preparing" },
  preparing: { label: "Preparando", color: "bg-blue-500", icon: ChefHat, next: "ready" },
  ready: { label: "Pronto", color: "bg-green-500", icon: CheckCircle, next: "delivered" },
  delivered: { label: "Entregue", color: "bg-muted", icon: Truck },
  cancelled: { label: "Cancelado", color: "bg-destructive", icon: XCircle },
};

const columns: OrderStatus[] = ["pending", "preparing", "ready", "delivered"];

const OrdersPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const storeId = roleData?.store_id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchOrders();
      // Realtime subscription
      const channel = supabase
        .channel("orders-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
          () => fetchOrders()
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [storeId]);

  const fetchOrders = async () => {
    if (!storeId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) setOrders(data);
    setLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Pedido atualizado para ${statusConfig[newStatus].label}`);
    }
  };

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" as OrderStatus })
      .eq("id", orderId);

    if (error) toast.error("Erro ao cancelar");
    else toast.success("Pedido cancelado");
  };

  const getSourceLabel = (source: string) => {
    const map: Record<string, string> = { totem: "🖥️ Totem", ifood: "🟢 iFood", counter: "🏪 Balcão", delivery: "🚗 Delivery" };
    return map[source] || source;
  };

  const getOrdersByStatus = (status: OrderStatus) => orders.filter((o) => o.status === status);

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Pedidos</h2>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma loja vinculada.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pedidos de Hoje</h2>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {columns.map((status) => {
          const config = statusConfig[status];
          const count = getOrdersByStatus(status).length;
          return (
            <Card key={status}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center`}>
                  <config.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((status) => {
          const config = statusConfig[status];
          const columnOrders = getOrdersByStatus(status);

          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${config.color}`} />
                <h3 className="font-semibold text-sm">{config.label}</h3>
                <Badge variant="secondary" className="ml-auto">{columnOrders.length}</Badge>
              </div>

              <div className="space-y-2 min-h-[200px]">
                {columnOrders.map((order) => (
                  <Card key={order.id} className="border-l-4" style={{ borderLeftColor: `var(--${status === 'pending' ? 'accent' : status === 'preparing' ? 'ring' : status === 'ready' ? 'success' : 'muted-foreground'})` }}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg">#{order.order_number}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span>{getSourceLabel(order.source)}</span>
                        {order.order_type && (
                          <Badge variant="outline" className="text-xs">
                            {order.order_type === "dine_in" ? "🍽️ Aqui" : "📦 Levar"}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">€ {Number(order.total).toFixed(2)}</span>
                        {order.payment_method && (
                          <Badge variant="secondary" className="text-xs capitalize">{order.payment_method}</Badge>
                        )}
                      </div>

                      <div className="flex gap-1 pt-1">
                        {config.next && (
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => updateStatus(order.id, config.next!)}
                          >
                            {statusConfig[config.next].label} →
                          </Button>
                        )}
                        {status === "pending" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs"
                            onClick={() => cancelOrder(order.id)}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {columnOrders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                    Nenhum pedido
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersPage;
