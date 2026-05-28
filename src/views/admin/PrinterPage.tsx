import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import {
  PrinterConfig, defaultConfig, fetchPrinterConfig, savePrinterConfig,
  printTestTicket, printSampleOrder, checkBridgeStatus, fetchBridgeLastSeen,
} from "@/services/printerService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Printer, Wifi, WifiOff, HelpCircle, Loader2, FileText, Network,
  Save, Download, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";

const PrinterPage = () => {
  const { storeId } = useAdminStoreId();
  const { stores } = useResolvedStore();
  const activeStoreName = stores.find((s) => s.id === storeId)?.name ?? "Unidade";
  const [cfg, setCfg] = useState<PrinterConfig>(defaultConfig);
  const [companyName, setCompanyName] = useState("Restaurante");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [bridge, setBridge] = useState<"active" | "inactive" | "unknown" | "checking">("checking");
  const [bridgeLastSeen, setBridgeLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const c = await fetchPrinterConfig(storeId);
      setCfg(c);
      const { data } = await supabase.from("company_settings")
        .select("company_name").eq("store_id", storeId).maybeSingle();
      if (data?.company_name) setCompanyName(data.company_name);
      else setCompanyName("Restaurante");
      setLoading(false);
    })();
  }, [storeId]);

  const refreshBridge = useCallback(async () => {
    if (!storeId) return;
    setBridge("checking");
    const [status, lastSeen] = await Promise.all([
      checkBridgeStatus(storeId),
      fetchBridgeLastSeen(storeId),
    ]);
    setBridge(status);
    setBridgeLastSeen(lastSeen);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    refreshBridge();
    const i = setInterval(refreshBridge, 30000);
    return () => clearInterval(i);
  }, [storeId, refreshBridge]);

  const upd = (k: keyof PrinterConfig, v: PrinterConfig[keyof PrinterConfig]) =>
    setCfg((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!storeId) return;
    setSaving(true);
    try {
      await savePrinterConfig(storeId, cfg);
      toast.success("Configuração guardada");
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
    } finally { setSaving(false); }
  };

  const runTest = async (type: "basic" | "sample") => {
    if (!storeId) return;
    setTesting(type);
    const result = type === "basic"
      ? await printTestTicket(storeId)
      : await printSampleOrder(storeId, companyName);
    setTesting(null);
    if (result.success) {
      toast.success(type === "basic"
        ? "Job de prueba enviado — aguarda impresión"
        : "Ticket de muestra enviado — aguarda impresión");
    } else {
      toast.error("Error: " + (result.error || "Falló al crear job"));
    }
  };

  const downloadBridge = () => {
    const env = `# print-bridge config — ${activeStoreName}
# OBRIGATÓRIO: uma instância por loja com STORE_ID único
SUPABASE_URL=${import.meta.env.VITE_SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=<cole_a_service_role_key_do_supabase>
# Fallback (não recomendado após hardening RLS):
# SUPABASE_ANON_KEY=${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}
STORE_ID=${storeId || ""}
DEFAULT_PRINTER_IP=${cfg.ip_address}
DEFAULT_PRINTER_PORT=${cfg.port}
`;
    const blob = new Blob([env], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "print-bridge.env";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusMap = {
    active: { icon: <Wifi className="w-4 h-4 text-green-500" />, label: "Bridge activo", color: "text-green-600" },
    inactive: { icon: <WifiOff className="w-4 h-4 text-destructive" />, label: "Bridge inactivo", color: "text-destructive" },
    unknown: { icon: <HelpCircle className="w-4 h-4 text-muted-foreground" />, label: "Sin datos recientes", color: "text-muted-foreground" },
    checking: { icon: <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />, label: "Verificando...", color: "text-muted-foreground" },
  };
  const status = statusMap[bridge];

  if (loading) return <div className="p-8 text-muted-foreground">A carregar...</div>;

  if (!storeId) {
    return (
      <div className="p-8 text-muted-foreground">
        Nenhuma unidade activa. Crie uma unidade em Unidades primeiro.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      <AdminStoreSwitcher hint="Cada unidade tem a sua impressora. Escolha a loja, configure e guarde — depois repita para a outra unidade." />

      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-sm font-bold text-foreground">A configurar: {activeStoreName}</p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">STORE_ID: {storeId}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Printer className="h-5 w-5" /> Impressora da cozinha
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Os pedidos desta unidade vão para esta impressora. Um computador na loja recebe e imprime os tickets.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" /> {saving ? "A guardar..." : "Guardar"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              {status.icon}
              <div>
                <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                <p className="text-[11px] text-muted-foreground">
                  Print Bridge no PC desta unidade
                  {bridgeLastSeen
                    ? ` · último sinal ${new Date(bridgeLastSeen).toLocaleTimeString("pt-PT")}`
                    : ""}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refreshBridge}>
              <Wifi className="w-3 h-3 mr-1" /> Verificar
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <Network className="w-3.5 h-3.5" />
            <span>{cfg.printer_name} — <span className="text-foreground font-mono">{cfg.ip_address}:{cfg.port}</span></span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Configuración</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Impresión automática</Label>
              <p className="text-xs text-muted-foreground">Imprime cada pedido confirmado</p>
            </div>
            <Switch checked={cfg.enabled} onCheckedChange={(v) => upd("enabled", v)} />
          </div>

          <div>
            <Label>Nombre / sector de la impresora</Label>
            <Input value={cfg.printer_name} onChange={(e) => upd("printer_name", e.target.value)} placeholder="Cocina" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>IP de la impresora</Label>
              <Input value={cfg.ip_address} onChange={(e) => upd("ip_address", e.target.value)} placeholder="192.168.1.200" className="font-mono" />
            </div>
            <div>
              <Label>Puerto</Label>
              <Input type="number" value={cfg.port} onChange={(e) => upd("port", Number(e.target.value) || 9100)} className="font-mono" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Copias por ticket</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                onClick={() => upd("printer_copies", Math.max(1, cfg.printer_copies - 1))}>-</Button>
              <span className="w-8 text-center font-medium">{cfg.printer_copies}</span>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                onClick={() => upd("printer_copies", Math.min(5, cfg.printer_copies + 1))}>+</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Probar impresión</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => runTest("basic")} disabled={!!testing} variant="outline" className="w-full">
            {testing === "basic"
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</>
              : <><Printer className="w-4 h-4 mr-2" /> Probar impresora LAN</>}
          </Button>
          <Button onClick={() => runTest("sample")} disabled={!!testing} variant="outline" className="w-full">
            {testing === "sample"
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</>
              : <><FileText className="w-4 h-4 mr-2" /> Probar ticket completo</>}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Jobs vão só para a fila desta unidade ({activeStoreName}). Compatível com impressoras ESC/POS LAN porta 9100 (ex.: NetumScan NS-8360L).
          </p>
        </CardContent>
      </Card>

      <Card className="border-accent/40 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent-foreground" /> Cómo funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Como las impresoras térmicas usan IPs internas de la red local (ej. <span className="font-mono">192.168.x.x</span>),
            no se puede imprimir directamente desde la nube. Por eso usamos un <b>Print Bridge</b>: un script de Node.js
            que corre en un PC dentro de la misma red de la impresora, escucha la fila <span className="font-mono">print_jobs</span>
            y envía los tickets ESC/POS vía TCP.
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Cliente/vendedor cria pedido → <span className="font-mono">orders.store_id</span> da unidade escolhida.</li>
            <li>Sistema chama <span className="font-mono">enqueue_print_job</span> → fila <span className="font-mono">print_jobs</span> (pending).</li>
            <li>Print Bridge no PC desta loja (com <span className="font-mono">STORE_ID</span> correcto) processa só jobs desta unidade.</li>
            <li>Bridge envia bytes ESC/POS 80mm por TCP ({cfg.ip_address}:{cfg.port}).</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Tabelas <span className="font-mono">printers</span> / <span className="font-mono">printer_category_map</span> são legado — use apenas <span className="font-mono">printer_settings</span> por loja.
          </p>
          <Button variant="outline" size="sm" onClick={downloadBridge}>
            <Download className="w-4 h-4 mr-2" /> Descargar configuración (.env) para el Bridge
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterPage;
