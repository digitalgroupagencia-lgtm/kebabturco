import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Link2, CheckCircle2, AlertCircle } from "lucide-react";

type WgmConfig = {
  enabled: boolean;
  marketplace_webhook_url: string;
  public_api_url: string;
  tenant_slug: string;
  notes: string | null;
};

type QueueRow = {
  id: string;
  order_id: string;
  event_type: string;
  status: string;
  last_error: string | null;
  created_at: string;
};

type RefRow = {
  order_id: string;
  wgm_order_id: string | null;
  wgm_order_numero: number | null;
  synced_at: string | null;
  last_error: string | null;
  last_status_synced: string | null;
};

const INBOUND_URL =
  "https://kvpssbhclafoymhecmuk.supabase.co/functions/v1/wgm-inbound-webhook";

const SYNC_DISPATCH_URL =
  "https://kvpssbhclafoymhecmuk.supabase.co/functions/v1/wgm-sync-dispatch";

function wgmInvokeErrorMessage(error: { message?: string } | null): string {
  const msg = error?.message ?? "";
  if (/edge function|not found|404|failed to send/i.test(msg)) {
    return "O servidor de envio ainda não está publicado. Faça Publish no Lovable (Kebab) e confirme em Cloud → Edge functions que existem wgm-sync-dispatch e wgm-inbound-webhook.";
  }
  return msg || "Erro ao contactar o servidor de envio";
}

export default function AdminWgmBridgePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [serverDeployed, setServerDeployed] = useState<boolean | null>(null);
  const [ping, setPing] = useState<{ api_key_configured?: boolean; enabled?: boolean } | null>(null);
  const [cfg, setCfg] = useState<WgmConfig | null>(null);
  const [pending, setPending] = useState<QueueRow[]>([]);
  const [refs, setRefs] = useState<RefRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: config }, { data: queue }, { data: orderRefs }] = await Promise.all([
      supabase.from("wgm_integration_config").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("flow_webhook_queue")
        .select("id, order_id, event_type, status, last_error, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("wgm_order_refs")
        .select("order_id, wgm_order_id, wgm_order_numero, synced_at, last_error, last_status_synced")
        .order("updated_at", { ascending: false })
        .limit(15),
    ]);
    setCfg((config as WgmConfig) ?? null);
    setPending((queue as QueueRow[]) ?? []);
    setRefs((orderRefs as RefRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch(SYNC_DISPATCH_URL, { method: "GET" })
      .then((r) => setServerDeployed(r.ok))
      .catch(() => setServerDeployed(false));
  }, [load]);

  const saveEnabled = async (enabled: boolean) => {
    if (!cfg) return;
    setSaving(true);
    const { error } = await supabase
      .from("wgm_integration_config")
      .update({ enabled })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCfg({ ...cfg, enabled });
    toast.success(enabled ? "Ponte PDV activada" : "Ponte PDV desactivada");
  };

  const runPing = async () => {
    const { data, error } = await supabase.functions.invoke("wgm-sync-dispatch", {
      body: { ping: true },
    });
    if (error) {
      toast.error(wgmInvokeErrorMessage(error));
      setServerDeployed(false);
      return;
    }
    setServerDeployed(true);
    setPing(data as typeof ping);
    if ((data as { api_key_configured?: boolean })?.api_key_configured) {
      toast.success("Chave WGM configurada no servidor");
    } else {
      toast.warning("Falta WGM_INTEGRATION_API_KEY nos secrets do Lovable");
    }
  };

  const processPending = async () => {
    setProcessing(true);
    const { data, error } = await supabase.functions.invoke("wgm-sync-dispatch", {
      body: { limit: 25 },
    });
    setProcessing(false);
    if (error) {
      toast.error(wgmInvokeErrorMessage(error));
      setServerDeployed(false);
      return;
    }
    setServerDeployed(true);
    const processed = (data as { processed?: number })?.processed ?? 0;
    toast.success(`Processados ${processed} item(ns) na fila`);
    load();
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> A carregar ponte PDV…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Link2 className="h-6 w-6" /> Ponte PDV WGM
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          O app Kebab continua com todas as funções. Os pedidos pagos são enviados ao PDV WGM e os estados voltam automaticamente.
          O dono vê resultados no PDV; a equipa continua a aceitar pedidos no app.
        </p>
      </div>

      {serverDeployed === false && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <p className="text-sm font-medium text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            O servidor de envio ao PDV ainda não está no ar (não foi publicado).
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            No Lovable do Kebab: faça <strong>Publish</strong> e confirme em Cloud → Edge functions as funções
            {" "}<strong>wgm-sync-dispatch</strong> e <strong>wgm-inbound-webhook</strong>.
            Sem isso, «Testar servidor» e «Processar fila» falham sempre.
          </p>
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-base font-semibold">Sincronização activa</Label>
            <p className="text-sm text-muted-foreground">
              Só envia pedidos quando está ligado e cada unidade tem o ID PDV configurado em Unidades.
            </p>
          </div>
          <Switch
            checked={cfg?.enabled ?? false}
            disabled={saving}
            onCheckedChange={saveEnabled}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={runPing}>
            Testar servidor
          </Button>
          <Button variant="outline" size="sm" onClick={processPending} disabled={processing}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Processar fila pendente
          </Button>
        </div>

        {ping && (
          <div className="flex gap-2 text-sm">
            {ping.api_key_configured ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> API key OK
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" /> API key em falta
              </Badge>
            )}
            <Badge variant={ping.enabled ? "default" : "secondary"}>
              {ping.enabled ? "Ponte ligada" : "Ponte desligada"}
            </Badge>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">URL para configurar no PDV WGM</h2>
        <p className="text-sm text-muted-foreground">
          No super-admin do WGM, em <strong>proprioapp_webhook_config</strong>, use esta URL e o mesmo segredo
          que colocar em <code className="text-xs">WGM_INBOUND_WEBHOOK_SECRET</code> no Lovable do Kebab.
        </p>
        <div className="flex gap-2 items-center">
          <code className="text-xs bg-muted p-2 rounded flex-1 break-all">{INBOUND_URL}</code>
          <Button size="sm" variant="secondary" onClick={() => copy(INBOUND_URL, "URL")}>
            Copiar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tenant slug: <strong>{cfg?.tenant_slug ?? "kebab-turco"}</strong>
        </p>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Fila pendente ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido à espera de envio.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {pending.map((q) => (
              <li key={q.id} className="border-b pb-2">
                <span className="font-mono text-xs">{q.event_type}</span>
                {" · "}
                <span className="text-muted-foreground">{q.created_at.slice(0, 19)}</span>
                {q.last_error && (
                  <p className="text-destructive text-xs mt-1">{q.last_error}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Últimos pedidos sincronizados</h2>
        {refs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há pedidos ligados ao PDV.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {refs.map((r) => (
              <li key={r.order_id} className="flex flex-wrap gap-2 items-center border-b pb-2">
                {r.synced_at ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                )}
                <span>
                  WGM #{r.wgm_order_numero ?? "—"}
                  {r.last_status_synced ? ` · ${r.last_status_synced}` : ""}
                </span>
                {r.last_error && (
                  <span className="text-destructive text-xs">{r.last_error}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
