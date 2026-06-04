import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, RotateCcw, ListOrdered, Trash2, FlaskConical, Send, Clock } from "lucide-react";
import { toast } from "sonner";

type Job = {
  id: string;
  order_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "text-amber-600 bg-amber-50" },
  printing: { label: "Imprimiendo", cls: "text-blue-600 bg-blue-50" },
  printed: { label: "Impreso", cls: "text-green-600 bg-green-50" },
  failed: { label: "Falló", cls: "text-destructive bg-destructive/10" },
};

type BulkAction = "failed" | "tests" | "retry-pending" | "old";

export default function PrintQueueCard({ storeId }: { storeId: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState<BulkAction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("print_jobs")
      .select("id, order_id, status, error_message, created_at, updated_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) toast.error("Error al cargar la cola: " + error.message);
    setJobs((data as Job[]) ?? []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    void load();
    const i = setInterval(() => void load(), 10_000);
    return () => clearInterval(i);
  }, [load]);

  const reprint = async (jobId: string) => {
    setRetrying(jobId);
    const { error } = await supabase
      .from("print_jobs")
      .update({ status: "pending", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    setRetrying(null);
    if (error) {
      toast.error("Error al reenviar: " + error.message);
      return;
    }
    toast.success("Job reenviado a impresión");
    void load();
  };

  const callCleanup = async (
    params: { _statuses?: string[]; _only_tests?: boolean; _older_than_hours?: number },
    successMsg: string,
  ) => {
    const { data, error } = await supabase.rpc("cleanup_print_jobs", {
      _store_id: storeId,
      _statuses: params._statuses ?? null,
      _only_tests: params._only_tests ?? false,
      _older_than_hours: params._older_than_hours ?? null,
    });
    if (error) {
      toast.error("Error: " + error.message);
      return;
    }
    const removed = (data as { deleted?: number } | null)?.deleted ?? 0;
    toast.success(`${successMsg} (${removed})`);
    void load();
  };

  const handleClearFailed = async () => {
    if (!confirm("¿Eliminar todos los jobs fallidos de esta tienda?")) return;
    setBulkBusy("failed");
    try {
      await callCleanup({ _statuses: ["failed"] }, "Fallidos eliminados");
    } finally {
      setBulkBusy(null);
    }
  };

  const handleClearTests = async () => {
    if (!confirm("¿Eliminar todos los jobs de pedidos de prueba?")) return;
    setBulkBusy("tests");
    try {
      await callCleanup({ _only_tests: true }, "Pruebas eliminadas");
    } finally {
      setBulkBusy(null);
    }
  };

  const handleRetryPending = async () => {
    setBulkBusy("retry-pending");
    try {
      const { data, error } = await supabase.rpc("retry_failed_print_jobs", { _store_id: storeId });
      if (error) {
        toast.error("Error al reintentar: " + error.message);
        return;
      }
      const requeued = (data as { requeued?: number } | null)?.requeued ?? 0;
      toast.success(`Reintentados (${requeued})`);
      void load();
    } finally {
      setBulkBusy(null);
    }
  };

  const handleClearOld = async () => {
    if (!confirm("¿Eliminar jobs de más de 48 horas?")) return;
    setBulkBusy("old");
    try {
      await callCleanup({ _older_than_hours: 48 }, "Antiguos eliminados");
    } finally {
      setBulkBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <ListOrdered className="h-5 w-5" /> Cola de impresión
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => void handleClearFailed()}
            disabled={bulkBusy !== null}
          >
            {bulkBusy === "failed" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
            Limpiar fallidos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => void handleClearTests()}
            disabled={bulkBusy !== null}
          >
            {bulkBusy === "tests" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FlaskConical className="w-3 h-3 mr-1" />}
            Limpiar pruebas
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => void handleRetryPending()}
            disabled={bulkBusy !== null}
          >
            {bulkBusy === "retry-pending" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
            Reintentar pendientes
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => void handleClearOld()}
            disabled={bulkBusy !== null}
          >
            {bulkBusy === "old" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Clock className="w-3 h-3 mr-1" />}
            Eliminar antiguos (&gt; 48 h)
          </Button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sin jobs recientes para esta tienda.
          </p>
        ) : (
          <div className="divide-y">
            {jobs.map((j) => {
              const st = STATUS_LABEL[j.status] ?? { label: j.status, cls: "text-muted-foreground bg-muted" };
              const canRetry = j.status === "failed" || j.status === "pending";
              return (
                <div key={j.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(j.created_at).toLocaleString("es-ES")}
                      </span>
                    </div>
                    {j.order_id && (
                      <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                        Pedido: {j.order_id.slice(0, 8)}
                      </p>
                    )}
                    {j.error_message && (
                      <p className="text-xs text-destructive mt-0.5 truncate" title={j.error_message}>
                        {j.error_message}
                      </p>
                    )}
                  </div>
                  {canRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void reprint(j.id)}
                      disabled={retrying === j.id}
                    >
                      {retrying === j.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <><RotateCcw className="w-3 h-3 mr-1" /> Reimprimir</>}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

