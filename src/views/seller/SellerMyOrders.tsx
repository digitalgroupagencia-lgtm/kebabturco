import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSellerContext } from "@/hooks/useSellerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Banknote } from "lucide-react";
import { fmtMoney } from "@/hooks/useTenantBilling";
import { format } from "date-fns";
import { useSellerPayment } from "@/hooks/useSellerPayment";
import { useStaffT } from "@/hooks/useStaffT";
import { toast } from "sonner";

type SellerOrderRow = {
  id: string;
  order_number: string | number;
  total: number | string | null;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
  table_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
};

const SellerMyOrders = () => {
  const { userId, storeId } = useSellerContext();
  const { t } = useStaffT();
  const { payCash, payCard, SellerPaymentDialogs, canPayCard } = useSellerPayment({
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
          "id, order_number, total, payment_status, payment_method, created_at, table_number, customer_name, customer_email",
        )
        .eq("store_id", storeId!)
        .eq("seller_id", userId!)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      return (rows ?? []) as SellerOrderRow[];
    },
  });

  const paidLabel = (method: string | null) => {
    if (method === "cash") return t("seller.orders.paid_cash");
    if (method === "card") return t("seller.orders.paid_card");
    return t("seller.orders.paid_generic");
  };

  const toPaymentOrder = (o: SellerOrderRow) => ({
    id: o.id,
    order_number: o.order_number,
    total: o.total ?? 0,
    customer_email: o.customer_email,
  });

  return (
    <div className="p-4 space-y-3">
      <SellerPaymentDialogs />
      <h1 className="text-xl font-black">{t("seller.orders.title")}</h1>

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
                          onClick={() => void payCash(toPaymentOrder(o))}
                        >
                          <Banknote className="h-3.5 w-3.5 mr-1" />
                          {t("seller.pay.cash")}
                        </Button>
                        {canPayCard ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-full font-bold"
                            onClick={() => void payCard(toPaymentOrder(o))}
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1" />
                            {t("seller.pay.card")}
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
    </div>
  );
};

export default SellerMyOrders;
