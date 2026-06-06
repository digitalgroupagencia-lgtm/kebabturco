import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coffee, ShoppingBag, Truck, Bell, Play, Trash2, Printer, RefreshCw, Activity, CheckCircle2, Circle, ListChecks, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { playTestAlert } from "@/lib/panelAlerts";
import HowToUsePanel from "@/components/admin/HowToUsePanel";

type Store = { id: string; name: string };
type Table = { id: string; number: string };

export default function OrderSimulatorPage() {
  const { user } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const isAdmin = roleData?.role === "admin_master";

  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [tables, setTables] = useState<Table[]>([]);
  const [tableId, setTableId] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [simLog, setSimLog] = useState<string[]>([]);
  const [diag, setDiag] = useState<any>(null);

  // Guided test wizard state
  type StepStatus = "pending" | "running" | "ok" | "fail";
  type Step = { id: string; label: string; status: StepStatus; detail?: string };
  const initialSteps: Step[] = [
    { id: "diag", label: "1. Verificar diagnóstico inicial (subscritores + fila)", status: "pending" },
    { id: "clean", label: "2. Limpar fila (pending + failed) antes do teste", status: "pending" },
    { id: "notif", label: "3. Disparar som + vibração + push de teste", status: "pending" },
    { id: "order", label: "4. Criar pedido teste (balcão) e gerar print_job", status: "pending" },
    { id: "verify", label: "5. Verificar se print_job foi criado e processado", status: "pending" },
    { id: "cleanup", label: "6. Remover pedidos de teste criados", status: "pending" },
  ];
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [wizardBusy, setWizardBusy] = useState(false);

  const setStep = (id: string, status: StepStatus, detail?: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status, detail } : s)));


  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("stores").select("id, name").eq("is_active", true).order("name").then(({ data }) => {
      if (data) {
        setStores(data);
        if (data.length > 0 && !storeId) setStoreId(data[0].id);
      }
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!storeId) return;
    supabase.from("tables").select("id, number").eq("store_id", storeId).eq("is_active", true).order("number").then(({ data }) => {
      setTables(data || []);
      setTableId(data && data[0] ? data[0].id : "");
    });
  }, [storeId]);

  const callSimulator = async (mode: "dine_in" | "takeaway" | "delivery", extra: Record<string, unknown> = {}) => {
    if (!storeId) {
      toast.error("Seleciona uma loja primeiro");
      return null;
    }
    setBusy(mode);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-test-order", {
        body: { storeId, mode, ...extra },
      });
      if (error) throw error;
      toast.success(`Pedido teste #${data.orderNumber} criado`);
      return data as { orderId: string; orderNumber: string };
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar pedido teste");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleDineIn = async () => {
    const table = tables.find((t) => t.id === tableId);
    await callSimulator("dine_in", { tableId, tableNumber: table?.number });
  };

  const handleTakeaway = async () => callSimulator("takeaway");
  const handleDelivery = async () => callSimulator("delivery");

  const handleTestNotifications = async () => {
    setBusy("notif");
    try {
      await playTestAlert();
      if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 500]);
      if (storeId) {
        await supabase.functions.invoke("send-push-notification", {
          body: { storeId, title: "[TESTE] Notificação", body: "Teste de notificação do simulador", tag: `test-notif-${Date.now()}`, url: "/panel/live" },
        });
      }
      toast.success("Som, vibração e push disparados");
    } catch (e: any) {
      toast.error(e.message || "Erro no teste");
    } finally {
      setBusy(null);
    }
  };

  const handleFullSimulation = async () => {
    setSimLog([]);
    const log = (msg: string) => setSimLog((l) => [...l, `${new Date().toLocaleTimeString()} — ${msg}`]);
    const order = await callSimulator("delivery");
    if (!order) return;
    setBusy("full");
    log(`Pedido #${order.orderNumber} criado (pending)`);
    for (const status of ["preparing", "ready", "out_for_delivery", "delivered"]) {
      await new Promise((r) => setTimeout(r, 4000));
      const { error } = await supabase.rpc("advance_test_order_status", { _order_id: order.orderId, _new_status: status });
      if (error) {
        log(`Erro: ${error.message}`);
        break;
      }
      log(`Status → ${status}`);
    }
    log("Simulação completa concluída");
    setBusy(null);
  };

  const handleCleanup = async () => {
    if (!confirm("Apagar TODOS os pedidos de teste? Esta acção não pode ser desfeita.")) return;
    setBusy("cleanup");
    const { data, error } = await supabase.rpc("cleanup_test_orders", { _store_id: storeId || null, _older_than: null });
    setBusy(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${(data as any)?.deleted ?? 0} pedidos de teste removidos`);
    }
  };

  const refreshDiag = async () => {
    setBusy("diag");
    const { data, error } = await supabase.rpc("admin_print_jobs_diagnostic", { _store_id: storeId || null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setDiag(data);
  };

  const clearJobs = async (statuses: string[], label: string) => {
    if (!confirm(`Apagar todos os print_jobs com status: ${statuses.join(", ")}?`)) return;
    setBusy("clear");
    const { data, error } = await supabase.rpc("admin_clear_print_jobs", { _store_id: storeId || null, _statuses: statuses });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${(data as any)?.deleted ?? 0} jobs (${label}) removidos`);
    refreshDiag();
  };

  const requeueJobs = async () => {
    setBusy("requeue");
    const { data, error } = await supabase.rpc("admin_requeue_print_jobs", { _store_id: storeId || null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${(data as any)?.requeued ?? 0} jobs reenfileirados`);
    refreshDiag();
  };

  useEffect(() => { if (isAdmin && storeId) refreshDiag(); /* eslint-disable-next-line */ }, [isAdmin, storeId]);

  const runGuidedTest = async () => {
    if (!storeId) { toast.error("Seleciona uma loja primeiro"); return; }
    setSteps(initialSteps.map((s) => ({ ...s, status: "pending", detail: undefined })));
    setWizardBusy(true);
    try {
      // Step 1: Diagnostic
      setStep("diag", "running");
      const { data: d1, error: e1 } = await supabase.rpc("admin_print_jobs_diagnostic", { _store_id: storeId });
      if (e1) { setStep("diag", "fail", e1.message); return; }
      setDiag(d1);
      const subs = (d1 as any)?.push_subscribers || {};
      const subsTxt = `web:${subs.web ?? 0} android:${subs.android ?? 0} ios:${subs.ios ?? 0}`;
      const androidWarn = (subs.android ?? 0) === 0 ? " ⚠️ Sem Android FCM" : "";
      setStep("diag", "ok", `${subsTxt}${androidWarn}`);

      // Step 2: Clear queue
      setStep("clean", "running");
      const { data: d2, error: e2 } = await supabase.rpc("admin_clear_print_jobs", { _store_id: storeId, _statuses: ["pending", "failed"] });
      if (e2) { setStep("clean", "fail", e2.message); return; }
      setStep("clean", "ok", `${(d2 as any)?.deleted ?? 0} jobs removidos`);

      // Step 3: Notifications
      setStep("notif", "running");
      try {
        await playTestAlert();
        if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 500]);
        await supabase.functions.invoke("send-push-notification", {
          body: { storeId, title: "[TESTE GUIADO] Notificação", body: "Som + vibração + push", tag: `guided-${Date.now()}`, url: "/panel/live" },
        });
        setStep("notif", "ok", "Som, vibração e push disparados");
      } catch (err: any) {
        setStep("notif", "fail", err.message || "Erro");
      }

      // Step 4: Create test order
      setStep("order", "running");
      const { data: orderData, error: orderErr } = await supabase.functions.invoke("simulate-test-order", {
        body: { storeId, mode: "takeaway" },
      });
      if (orderErr || !orderData) { setStep("order", "fail", orderErr?.message || "Falha"); return; }
      setStep("order", "ok", `Pedido #${orderData.orderNumber} criado`);

      // Step 5: Verify print job
      setStep("verify", "running");
      await new Promise((r) => setTimeout(r, 3000));
      const { data: jobs, error: jobErr } = await supabase
        .from("print_jobs")
        .select("id, status, error_message, created_at")
        .eq("order_id", orderData.orderId)
        .order("created_at", { ascending: false });
      if (jobErr) { setStep("verify", "fail", jobErr.message); return; }
      if (!jobs || jobs.length === 0) {
        setStep("verify", "fail", "Nenhum print_job criado (verifica printer_category_map e printers ativos)");
      } else {
        const j = jobs[0];
        const statusLabel = j.status === "printed" ? "✅ impresso" : j.status === "failed" ? `❌ falhou: ${j.error_message || "?"}` : `⏳ ${j.status}`;
        setStep("verify", j.status === "printed" ? "ok" : j.status === "failed" ? "fail" : "ok", `${jobs.length} job(s) — último: ${statusLabel}`);
      }

      // Step 6: Cleanup
      setStep("cleanup", "running");
      const { data: d6, error: e6 } = await supabase.rpc("cleanup_test_orders", { _store_id: storeId, _older_than: null });
      if (e6) { setStep("cleanup", "fail", e6.message); return; }
      setStep("cleanup", "ok", `${(d6 as any)?.deleted ?? 0} pedidos teste removidos`);

      await refreshDiag();
      toast.success("Teste guiado concluído");
    } finally {
      setWizardBusy(false);
    }
  };

  if (roleLoading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> A carregar…</div>;
  if (!isAdmin) return <div className="p-8 text-muted-foreground">Acesso restrito a admin_master.</div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <HowToUsePanel
        purpose="Cria pedidos de teste com a tag [TESTE]. Servem para validar som, push, impressão e fluxo sem sujar a contabilidade."
        whenToUse="Use ao instalar um restaurante novo, ao trocar de impressora, ou quando alguém reclama que não tocou."
        steps={[
          "Escolha a loja a testar.",
          "Use o assistente em passos: ele dispara som → push → cria pedido → confere impressão → limpa.",
          "Confirme que tocou som, vibração e que a comanda saiu na impressora.",
          "Os pedidos teste são removidos automaticamente. NUNCA aparecem em faturamento.",
        ]}
        howToConfirm="Se todos os 6 passos ficarem verdes, a operação está pronta. Vermelho = veja o detalhe e corrija."
        assistantQuestion="Quando devo rodar o Simulador de Pedidos e o que cada um dos 6 passos verifica?"
      />
      <div>
        <h1 className="text-2xl font-bold">Simulador de Pedidos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ferramenta de testes operacionais. Os pedidos criados aqui aparecem com a tag <Badge className="bg-yellow-500 text-black mx-1">[TESTE]</Badge>
          e <strong>não entram</strong> em faturamento, relatórios, estatísticas, ranking ou estoque.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loja a testar</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Selecionar loja" /></SelectTrigger>
            <SelectContent>
              {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4" /> Teste Guiado — Validação Completa</CardTitle>
          <CardDescription>
            Executa em sequência: diagnóstico → limpar fila → som/vibração/push → pedido teste → verificar impressão → cleanup.
            Mantém o painel operador (/panel/live) aberto noutro separador para ver o pedido chegar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runGuidedTest} disabled={wizardBusy || !!busy} className="w-full">
            {wizardBusy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> A executar teste guiado…</> : "▶ Iniciar Teste Guiado"}
          </Button>
          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.id} className="flex items-start gap-2 text-sm bg-muted/40 rounded-md p-2">
                <div className="mt-0.5">
                  {s.status === "ok" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {s.status === "fail" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  {s.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {s.status === "pending" && <Circle className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={s.status === "fail" ? "text-destructive font-medium" : ""}>{s.label}</div>
                  {s.detail && <div className="text-xs text-muted-foreground font-mono mt-0.5 break-all">{s.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Coffee className="h-4 w-4" /> Pedido Teste — Mesa</CardTitle>
            <CardDescription>Dispara fluxo completo de pedido em mesa (operador, cozinha, impressora).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={tableId} onValueChange={setTableId} disabled={tables.length === 0}>
              <SelectTrigger><SelectValue placeholder={tables.length ? "Selecionar mesa" : "Sem mesas activas"} /></SelectTrigger>
              <SelectContent>
                {tables.map((t) => <SelectItem key={t.id} value={t.id}>Mesa {t.number}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleDineIn} disabled={!!busy || !tableId} className="w-full">
              {busy === "dine_in" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Pedido Teste - Mesa"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Pedido Teste — Balcão</CardTitle>
            <CardDescription>Cria pedido de balcão (takeaway) e dispara impressão + notificações.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTakeaway} disabled={!!busy} className="w-full">
              {busy === "takeaway" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Pedido Teste - Balcão"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Pedido Teste — Delivery</CardTitle>
            <CardDescription>Pedido de entrega com endereço fake. Valida fluxo do entregador.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDelivery} disabled={!!busy} className="w-full">
              {busy === "delivery" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Pedido Teste - Delivery"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Testar Notificações</CardTitle>
            <CardDescription>Dispara som, vibração e push sem criar pedido.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTestNotifications} disabled={!!busy} variant="secondary" className="w-full">
              {busy === "notif" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar Notificações"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Play className="h-4 w-4" /> Simulação Completa Automática</CardTitle>
          <CardDescription>Cria pedido delivery e avança por todos os status (pending → preparing → ready → out_for_delivery → delivered) a cada 4s.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleFullSimulation} disabled={!!busy} className="w-full">
            {busy === "full" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Executar Simulação Completa"}
          </Button>
          {simLog.length > 0 && (
            <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-1 max-h-60 overflow-auto">
              {simLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Printer className="h-4 w-4" /> Fila de Impressão & Bridge</CardTitle>
          <CardDescription>Diagnóstico da fila de impressão e dos subscritores de push (web / Android / iOS).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={refreshDiag} disabled={!!busy} variant="secondary" size="sm">
              {busy === "diag" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Activity className="h-4 w-4 mr-1" /> Atualizar diagnóstico</>}
            </Button>
            <Button onClick={() => clearJobs(["pending"], "pending")} disabled={!!busy} variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-1" /> Limpar pendentes
            </Button>
            <Button onClick={() => clearJobs(["failed"], "failed")} disabled={!!busy} variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-1" /> Limpar falhados
            </Button>
            <Button onClick={requeueJobs} disabled={!!busy} variant="default" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" /> Reprocessar falhados
            </Button>
          </div>
          {diag && (
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-muted rounded-md p-3">
                <div className="font-semibold mb-1">Jobs por status</div>
                <pre className="font-mono whitespace-pre-wrap">{JSON.stringify(diag.by_status, null, 2)}</pre>
              </div>
              <div className="bg-muted rounded-md p-3">
                <div className="font-semibold mb-1">Subscritores de push</div>
                <pre className="font-mono whitespace-pre-wrap">{JSON.stringify(diag.push_subscribers, null, 2)}</pre>
                {(diag.push_subscribers?.android ?? 0) === 0 && (
                  <div className="mt-2 text-yellow-700 dark:text-yellow-400">
                    ⚠️ Nenhum dispositivo Android registado em FCM. Push em background não funcionará no tablet.
                  </div>
                )}
              </div>
              {diag.oldest_pending && (
                <div className="bg-muted rounded-md p-3 sm:col-span-2">
                  <div className="font-semibold mb-1">Job pendente mais antigo</div>
                  <pre className="font-mono whitespace-pre-wrap text-[11px]">{JSON.stringify(diag.oldest_pending, null, 2)}</pre>
                </div>
              )}
              {diag.last_failed && (
                <div className="bg-muted rounded-md p-3 sm:col-span-2">
                  <div className="font-semibold mb-1">Última falha</div>
                  <pre className="font-mono whitespace-pre-wrap text-[11px]">{JSON.stringify(diag.last_failed, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Limpeza</CardTitle>
          <CardDescription>Remove permanentemente todos os pedidos com tag [TESTE] da loja selecionada.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCleanup} disabled={!!busy} variant="destructive">
            {busy === "cleanup" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Limpar Pedidos de Teste"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
