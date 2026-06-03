import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, RotateCcw, ListOrdered } from "lucide-react";
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
  pending: { label: "Pendente", cls: "text-amber-600 bg-amber-50" },
  printing: { label: "A imprimir", cls: "text-blue-600 bg-blue-50" },
  printed: { label: "Impresso", cls: "text-green-600 bg-green-50" },
  failed: { label: "Falhou", cls: "text-destructive bg-destructive/10" },
};

export default function PrintQueueCard({ storeId }: { storeId: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("print_jobs")
      .select("id, order_id, status, error_message, created_at, updated_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) toast.error("Erro a carregar fila: " + error.message);
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
      toast.error("Erro ao reenviar: " + error.message);
      return;
    }
    toast.success("Job reenviado para impressão");
    void load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <ListOrdered className="h-5 w-5" /> Fila de impressão
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        </Button>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sem jobs recentes para esta unidade.
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
                        {new Date(j.created_at).toLocaleString("pt-PT")}
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
