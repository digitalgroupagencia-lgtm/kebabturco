import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import {
  PrinterConfig, defaultConfig, fetchPrinterConfig, savePrinterConfig,
  printTestTicket, printSampleOrder, checkBridgeStatus,
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

const PrinterPage = () => {
  const { storeId } = useAdminStoreId();
  const [cfg, setCfg] = useState<PrinterConfig>(defaultConfig);
  const [companyName, setCompanyName] = useState("Restaurante");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [bridge, setBridge] = useState<"active" | "inactive" | "unknown" | "checking">("checking");

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const c = await fetchPrinterConfig(storeId);
      setCfg(c);
      const { data } = await supabase.from("company_settings")
        .select("company_name").eq("store_id", storeId).maybeSingle();
      if (data?.company_name) setCompanyName(data.company_name);
      setLoading(false);
    })();
  }, [storeId]);

  const refreshBridge = useCallback(async () => {
    if (!storeId) return;
    setBridge("checking");
    setBridge(await checkBridgeStatus(storeId));
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
      toast.success("Configuración guardada");
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
    const env = `# print-bridge config\nSUPABASE_URL=${import.meta.env.VITE_SUPABASE_URL}\nSUPABASE_ANON_KEY=${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}\nSTORE_ID=${storeId || ""}\nDEFAULT_PRINTER_IP=${cfg.ip_address}\nDEFAULT_PRINTER_PORT=${cfg.port}\n`;
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

  if (loading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Printer className="h-5 w-5" /> Impresora LAN (ESC/POS)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Los tickets se encolan en la base de datos y el <b>Print Bridge</b> local del restaurante los imprime.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              {status.icon}
              <div>
                <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                <p className="text-[11px] text-muted-foreground">Print Bridge en el PC del restaurante</p>
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
            Los jobs se encolan en la base de datos y el Print Bridge del PC los procesa.
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
            <li>Cliente/vendedor crea pedido → se inserta en <span className="font-mono">orders</span>.</li>
            <li>El sistema llama <span className="font-mono">enqueue_print_job</span> → crea fila en <span className="font-mono">print_jobs</span> (status: pending).</li>
            <li>El Print Bridge en el PC del restaurante detecta el job por Realtime + polling.</li>
            <li>El Bridge envía los bytes ESC/POS por TCP a la impresora ({cfg.ip_address}:{cfg.port}).</li>
          </ol>
          <Button variant="outline" size="sm" onClick={downloadBridge}>
            <Download className="w-4 h-4 mr-2" /> Descargar configuración (.env) para el Bridge
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterPage;
