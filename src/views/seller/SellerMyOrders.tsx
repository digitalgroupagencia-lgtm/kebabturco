import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSellerContext } from "@/hooks/useSellerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone, Banknote } from "lucide-react";
import { fmtMoney } from "@/hooks/useTenantBilling";
import { format } from "date-fns";
import { useTapToPayCheckout } from "@/hooks/useTapToPayCheckout";
import { useStaffPinConfirm } from "@/hooks/useStaffPinConfirm";
import { useStaffT } from "@/hooks/useStaffT";
import { toast } from "sonner";
import { markOrderPaidAtCounter } from "@/services/orderService";
import { explainStaffPinPaymentError } from "@/lib/staffAccessPin";
import TapToPaySettingsSection from "@/components/tapToPay/TapToPaySettingsSection";
import { isTapToPayUiAvailable } from "@/lib/tapToPayDemo";

type SellerOrderRow = {
  id: string;
  order_number: string | number;
  total: number | string | null;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
  table_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
};

const SellerMyOrders = () => {
  const { userId, storeId } = useSellerContext();
  const { t, lang } = useStaffT();
  const uiLang = lang === "en" ? "es" : lang;
  const { requestStaffPin, StaffPinDialog } = useStaffPinConfirm();
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
        .select(
          "id, order_number, total, status, payment_status, payment_method, created_at, table_number, customer_name, customer_email",
        )
        .eq("store_id", storeId!)
        .eq("seller_id", userId!)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      return (rows ?? []) as SellerOrderRow[];
    },
  });

  const confirmCashPayment = async (order: SellerOrderRow) => {
    const pin = await requestStaffPin({
      amountLabel: `#${order.order_number} · ${fmtMoney(Number(order.total || 0))}`,
      description: t("seller.orders.pay_cash"),
    });
    if (!pin) return;
    try {
      await markOrderPaidAtCounter(order.id, "cash", pin);
      toast.success(t("tapToPay.step.success"));
      void refetch();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      toast.error(explainStaffPinPaymentError(raw, uiLang));
    }
  };

  const paidLabel = (method: string | null) => {
    if (method === "cash") return t("seller.orders.paid_cash");
    if (method === "card") return t("seller.orders.paid_card");
    return t("seller.orders.paid_generic");
  };

  return (
    <div className="p-4 space-y-3">
      <TapToPayCheckoutDialog />
      <StaffPinDialog />
      <h1 className="text-xl font-black">{t("seller.orders.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("seller.orders.collect_hint")}</p>

      {isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : data?.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{t("seller.orders.empty")}</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data?.map((o) => {
            const canCollect = o.payment_status !== "paid";
            return (
              <Card key={o.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate">#{o.order_number} {o.customer_name ? `· ${o.customer_name}` : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.table_number ? `Mesa ${o.table_number} · ` : ""}{format(new Date(o.created_at), "dd/MM HH:mm")}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1 min-w-[8.5rem]">
                    <p className="font-black">{fmtMoney(Number(o.total || 0))}</p>
                    {canCollect ? (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          className="h-8 w-full font-bold"
                          onClick={() => void confirmCashPayment(o)}
                        >
                          <Banknote className="h-3.5 w-3.5 mr-1" />
                          {t("seller.orders.pay_cash")}
                        </Button>
                        {isTapToPayAvailable ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-full font-bold text-[10px]"
                            onClick={() =>
                              void requestTapToPay({
                                id: o.id,
                                order_number: o.order_number,
                                total: o.total ?? 0,
                                customer_email: o.customer_email,
                              })
                            }
                          >
                            <Smartphone className="h-3.5 w-3.5 mr-1" />
                            {t("ops.card.tap_to_pay")}
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        {paidLabel(o.payment_method)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {storeId && isTapToPayUiAvailable() ? (
        <details className="rounded-xl border border-border bg-card/50 p-3">
          <summary className="cursor-pointer text-xs font-bold text-muted-foreground">
            {t("seller.orders.tap_optional")}
          </summary>
          <div className="mt-3">
            <TapToPaySettingsSection storeId={storeId} compact />
          </div>
        </details>
      ) : null}
    </div>
  );
};

export default SellerMyOrders;
