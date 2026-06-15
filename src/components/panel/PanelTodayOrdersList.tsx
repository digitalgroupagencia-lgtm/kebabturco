import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, CreditCard, Receipt } from "lucide-react";
import PremiumChartCard from "@/components/admin/premium/PremiumChartCard";
import {
  getPanelPaymentBadge,
  getPaymentMethodLabel,
  getStatusLabel,
} from "@/lib/orderStatusLabels";
import { nav } from "@/lib/navPaths";
import { useStaffT } from "@/hooks/useStaffT";
import { formatStaffPanelTime, panelT } from "@/lib/staffPanelLocale";

export type PanelTodayOrderRow = {
  id: string;
  order_number: number;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  status: string;
  order_type?: string | null;
  created_at: string;
  customer_name: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const paymentBadgeClass = {
  paid: "bg-green-600 text-white",
  pending: "bg-yellow-500 text-black",
} as const;

type Props = {
  orders: PanelTodayOrderRow[];
  loading?: boolean;
  onOrderClick?: (orderId: string) => void;
};

export default function PanelTodayOrdersList({ orders, loading, onOrderClick }: Props) {
  const { t, lang } = useStaffT();

  return (
    <PremiumChartCard
      title={t("dashboard.today_orders")}
      subtitle={t("dashboard.today_orders.subtitle")}
      action={
        <Button asChild variant="outline" size="sm" className="gap-1 h-8 text-xs font-bold">
          <Link to={nav.panel("live")}>
            {t("nav.live")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("ops.loading.orders")}</p>
      ) : orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.today_orders.empty")}</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/50 overflow-hidden">
          {orders.map((order) => {
            const payment = getPanelPaymentBadge(order, lang);
            const methodLabel =
              payment.methodLabel ?? getPaymentMethodLabel(order.payment_method, lang) ?? "—";
            const time = formatStaffPanelTime(order.created_at, lang);
            const orderCode = String(order.order_number).padStart(4, "0");

            return (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => onOrderClick?.(order.id)}
                  className="flex w-full flex-col gap-2 bg-card px-3 py-3 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4 sm:px-4 staff-wide:flex-row staff-wide:items-center touch-action-manipulation"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-base tabular-nums">
                        {panelT(lang, "order.number", { code: orderCode })}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.customer_name || t("common.customer")} · {time}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="text-lg font-black tabular-nums text-primary">
                      {fmt(Number(order.total))}
                    </span>
                    <Badge className={paymentBadgeClass[payment.tone]}>{payment.label}</Badge>
                    <Badge variant="secondary" className="gap-1 font-semibold">
                      <CreditCard className="h-3 w-3" />
                      {methodLabel}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getStatusLabel(order.status, order.order_type, lang)}
                    </Badge>
                    <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PremiumChartCard>
  );
}
