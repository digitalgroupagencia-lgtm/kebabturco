import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reprintPanelOrder } from "@/features/ops/panelPrintHelper";
import type { PanelOrder } from "@/features/ops/usePanelOrders";
import { useStaffT } from "@/hooks/useStaffT";

const OpsOrderDetailSheet = lazy(() => import("@/features/ops/OpsOrderDetailSheet"));

type Props = {
  orderId: string | null;
  storeId: string | null;
  viewerRole?: string | null;
  onClose: () => void;
  onGoToLive: () => void;
};

export default function PanelDashboardOrderSheet({
  orderId,
  storeId,
  viewerRole,
  onClose,
  onGoToLive,
}: Props) {
  const { t } = useStaffT();
  const { data } = useQuery({
    queryKey: ["panel-dashboard-order-detail", storeId, orderId],
    enabled: !!storeId && !!orderId,
    retry: 1,
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId!)
        .maybeSingle();
      if (error) throw error;
      if (!order) return { order: null, items: [] };

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId!);
      if (itemsError) throw itemsError;

      return { order: order as PanelOrder, items: items ?? [] };
    },
  });

  if (!orderId) return null;

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OpsOrderDetailSheet
        order={data?.order ?? null}
        items={data?.items ?? []}
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        viewerRole={viewerRole}
        onAdvance={onGoToLive}
        onRequestAccept={onGoToLive}
        onRequestAssignDriver={onGoToLive}
        onCancel={onGoToLive}
        onSetPrepMinutes={onGoToLive}
        onMarkPaid={onGoToLive}
        onReprint={async (order) => {
          if (!storeId) return;
          try {
            await reprintPanelOrder(storeId, order, data?.items ?? []);
            toast.success(t("print.toast.sent"));
          } catch (e) {
            toast.error(e instanceof Error ? e.message : t("print.toast.error"));
          }
        }}
      />
    </Suspense>
  );
}
