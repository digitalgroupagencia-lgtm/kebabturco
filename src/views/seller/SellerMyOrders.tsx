import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSellerContext } from "@/hooks/useSellerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone } from "lucide-react";
import { fmtMoney } from "@/hooks/useTenantBilling";
import { format } from "date-fns";
import { useTapToPayCheckout } from "@/hooks/useTapToPayCheckout";
import { useStaffT } from "@/hooks/useStaffT";
import { toast } from "sonner";
import TapToPaySettingsSection from "@/components/tapToPay/TapToPaySettingsSection";
import TapToPayStaffBootstrap from "@/components/tapToPay/TapToPayStaffBootstrap";
import { isAwaitingCounterPaymentConfirmation } from "@/lib/orderKitchenRules";

const SellerMyOrders = () => {
  const { userId, storeId } = useSellerContext();
  const { t } = useStaffT();
  const { requestTapToPay, TapToPayCheckoutDialog, isTapToPayAvailable } = useTapToPayCheckout({
    storeId: storeId ?? "",
    onSuccess: () => {
      toast.success(t("tapToPay.step.success"));
      void refetch();
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-orders", userId, storeId],
    enabled: !!userId && !!storeId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data: rows } = await supabase
        .from("orders")
        .select("id, order_number, total, status, payment_status, created_at, table_number, customer_name, customer_email")
        .eq("store_id", storeId!)
        .eq("seller_id", userId!)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      return rows ?? [];
    },
  });

  return (
    <div className="p-4 space-y-3">
      <TapToPayStaffBootstrap storeId={storeId} />
      <TapToPayCheckoutDialog />
      <h1 className="text-xl font-black">Meus pedidos</h1>

      {storeId ? <TapToPaySettingsSection storeId={storeId} compact /> : null}

      {isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : data?.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhum pedido nos últimos 7 dias.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data?.map((o: any) => {
            const canCharge =
              isTapToPayAvailable &&
              isAwaitingCounterPaymentConfirmation(o as any);
            return (
              <Card key={o.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate">#{o.order_number} {o.customer_name ? `· ${o.customer_name}` : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.table_number ? `Mesa ${o.table_number} · ` : ""}{format(new Date(o.created_at), "dd/MM HH:mm")}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="font-black">{fmtMoney(Number(o.total || 0))}</p>
                    <Badge variant="secondary" className="text-[10px]">{o.payment_status === "paid" ? "Pago" : o.status}</Badge>
                    {canCharge ? (
                      <Button
                        size="sm"
                        className="h-8 w-full font-bold"
                        onClick={() =>
                          void requestTapToPay({
                            id: o.id,
                            order_number: o.order_number,
                            total: o.total,
                            customer_email: o.customer_email,
                          })
                        }
                      >
                        <Smartphone className="h-3.5 w-3.5 mr-1" />
                        {t("ops.card.tap_to_pay")}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SellerMyOrders;
