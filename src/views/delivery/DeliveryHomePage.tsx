import { useState } from "react";
import { Loader2, MapPin, Phone, Navigation, Package, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useDriverOrders } from "@/features/delivery/useDriverOrders";
import { validateDeliveryCode } from "@/features/ops/opsOrderUi";

const DeliveryHomePage = () => {
  const { storeId } = useAdminStoreId();
  const { orders, loading, startDelivery, confirmDelivery, refresh } = useDriverOrders(storeId);
  const [codeByOrder, setCodeByOrder] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="font-bold text-lg">Sem entregas atribuídas</p>
        <p className="text-sm text-muted-foreground">Quando o restaurante atribuir um pedido, aparece aqui.</p>
        <Button variant="outline" onClick={() => void refresh()}>Actualizar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isOut = order.status === "out_for_delivery";
        const code = codeByOrder[order.id] ?? "";
        const mapsUrl = [
          order.delivery_street,
          order.delivery_number,
          order.delivery_city,
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <article
            key={order.id}
            className={`rounded-2xl border-2 bg-card overflow-hidden shadow-sm ${
              isOut ? "border-orange-500" : "border-yellow-500/60"
            }`}
          >
            <div className="px-4 py-3 bg-muted/30 flex items-center justify-between gap-2">
              <div>
                <p className="text-2xl font-black tabular-nums">#{order.order_number}</p>
                <p className="text-sm font-semibold">{order.customer_name || "Cliente"}</p>
              </div>
              <div className="text-right">
                <Badge className={isOut ? "bg-orange-600" : "bg-yellow-500 text-black"}>
                  {isOut ? "A caminho" : "Pronto"}
                </Badge>
                <p className="text-lg font-black text-primary mt-1">€{Number(order.total).toFixed(2)}</p>
              </div>
            </div>

            <div className="px-4 py-3 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-orange-600" />
                <span className="font-medium">
                  {order.delivery_street}
                  {order.delivery_number ? ` ${order.delivery_number}` : ""}
                  {order.delivery_city ? `, ${order.delivery_city}` : ""}
                </span>
              </div>
              {order.customer_phone && (
                <a
                  href={`tel:${order.customer_phone}`}
                  className="flex items-center gap-2 font-semibold text-primary"
                >
                  <Phone className="h-4 w-4" /> {order.customer_phone}
                </a>
              )}
              {(order.delivery_notes || order.notes) && (
                <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 p-2">
                  {order.delivery_notes || order.notes}
                </p>
              )}
            </div>

            {order.delivery_confirmation_code && (
              <div className="mx-4 mb-3 rounded-xl border border-orange-500/40 bg-orange-500/10 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Código</p>
                <p className="text-3xl font-black tracking-[0.25em] tabular-nums text-orange-600">
                  {order.delivery_confirmation_code}
                </p>
              </div>
            )}

            <div className="px-4 pb-4 space-y-2">
              {mapsUrl && (
                <Button variant="outline" className="w-full h-11 font-bold" asChild>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="h-4 w-4 mr-2" /> Abrir rota
                  </a>
                </Button>
              )}

              {!isOut ? (
                <Button
                  className="w-full h-12 font-black text-base bg-orange-600 hover:bg-orange-700"
                  disabled={busyId === order.id}
                  onClick={async () => {
                    setBusyId(order.id);
                    try {
                      await startDelivery(order);
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {busyId === order.id ? "A iniciar…" : "Iniciar entrega"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" /> Código do cliente
                  </div>
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0000"
                    value={code}
                    onChange={(e) =>
                      setCodeByOrder((prev) => ({
                        ...prev,
                        [order.id]: e.target.value.replace(/\D/g, "").slice(0, 4),
                      }))
                    }
                    className="h-12 text-center text-2xl font-black tracking-[0.3em]"
                  />
                  <Button
                    className="w-full h-12 font-black text-base bg-green-600 hover:bg-green-700"
                    disabled={!validateDeliveryCode(code) || busyId === order.id}
                    onClick={async () => {
                      setBusyId(order.id);
                      try {
                        await confirmDelivery(order, code.trim());
                        setCodeByOrder((prev) => ({ ...prev, [order.id]: "" }));
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    {busyId === order.id ? "A validar…" : "Finalizar entrega"}
                  </Button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default DeliveryHomePage;
