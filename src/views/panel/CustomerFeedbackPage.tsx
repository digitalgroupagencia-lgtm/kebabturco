import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Check, RefreshCw, Loader2 } from "lucide-react";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useStaffT } from "@/hooks/useStaffT";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type FeedbackRow = {
  id: string;
  order_id: string;
  order_number: string | null;
  order_status_at_send: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
  orders: { customer_name: string | null; order_type: string | null } | null;
};

export default function CustomerFeedbackPage() {
  const { t } = useStaffT();
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_order_feedback")
      .select("id, order_id, order_number, order_status_at_send, message, read_at, created_at, orders(customer_name, order_type)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data || []) as FeedbackRow[]);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const markRead = async (id: string) => {
    const { error } = await supabase
      .from("customer_order_feedback")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)));
  };

  if (storeLoading || loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> {t("customerFeedback.loading")}
      </div>
    );
  }

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">{t("common.no_store")}</div>;
  }

  const unreadCount = rows.filter((r) => !r.read_at).length;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            {t("customerFeedback.title")}
            {unreadCount > 0 && (
              <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("customerFeedback.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchRows()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          {t("common.refresh")}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t("customerFeedback.empty")}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const date = new Date(row.created_at).toLocaleString(undefined, {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            const unread = !row.read_at;
            return (
              <div
                key={row.id}
                className={`rounded-xl border p-4 space-y-2 ${unread ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      #{row.order_number || "—"} · {row.orders?.customer_name || t("customerFeedback.anonymous")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {date}
                      {row.order_status_at_send ? ` · ${row.order_status_at_send}` : ""}
                      {row.orders?.order_type ? ` · ${row.orders.order_type}` : ""}
                    </p>
                  </div>
                  {unread && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void markRead(row.id)}>
                      <Check className="w-3 h-3 mr-1" />
                      {t("customerFeedback.markRead")}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{row.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
