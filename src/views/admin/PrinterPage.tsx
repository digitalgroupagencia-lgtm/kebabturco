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
  Save, Download, AlertTriangle, Copy, Monitor,
} from "lucide-react";
import { toast } from "sonner";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import PrintQueueCard from "./PrintQueueCard";

const BRIDGE_ZIP_URL = "/downloads/kebab-print-bridge.zip";

function buildEnvTemplate(
  activeStoreName: string,
  storeId: string,
  ip: string,
  port: number,
  supabaseUrl: string,
) {
  return `# Kebab Print Bridge — ${activeStoreName}
# Uma instância por loja. Cole no PC: C:\\kebab-print-bridge\\.env

SUPABASE_URL=${supabaseUrl}
SUPABASE_SERVICE_ROLE_KEY=<cole_a_service_role_key_do_supabase>

STORE_ID=${storeId}

PRINTER_IP=${ip}
PRINTER_PORT=${port}

# Aliases legados (opcional):
# DEFAULT_PRINTER_IP=${ip}
# DEFAULT_PRINTER_PORT=${port}
`;
}

const PrinterPage = () => {
  const { storeId } = useAdminStoreId();
  const { stores } = useResolvedStore();
  const activeStoreName = stores.find((s) => s.id === storeId)?.name ?? "Unidade";
  const [cfg, setCfg] = useState<PrinterConfig>(defaultConfig);
  const [companyName, setCompanyName] = useState("Restaurante");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [copyingEnv, setCopyingEnv] = useState(false);
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

  const envTemplate = buildEnvTemplate(
    activeStoreName,
    storeId || "",
    cfg.ip_address,
    cfg.port,
    import.meta.env.VITE_SUPABASE_URL || "",
  );

  const downloadEnvFile = () => {
    const blob = new Blob([envTemplate], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "print-bridge.env";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ficheiro .env descarregado");
  };

  const copyEnvToClipboard = async () => {
    setCopyingEnv(true);
    try {
      await navigator.clipboard.writeText(envTemplate);
      toast.success(".env copiado — cole no Bloco de notas em C:\\kebab-print-bridge\\.env");
    } catch {
      toast.error("Não foi possível copiar. Use Descarregar .env.");
    } finally {
      setCopyingEnv(false);
    }
  };

  const runTest = async (type: "basic" | "sample") => {
    if (!storeId) return;
    setTesting(type);
    const result = type === "basic"
      ? await printTestTicket(storeId)
      : await printSampleOrder(storeId, companyName);
    setTesting(null);
    if (result.success) {
      const target = cfg.print_mode === "android_direct"
        ? "tablet Android desta loja"
        : "PC da loja";
      toast.success(`Teste enviado — aguarde impressão no ${target}`);
    } else {
      toast.error("Erro: " + (result.error || "Falha ao criar job"));
    }
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
          <div className="space-y-2">
            <Label>Modo de impressão</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => upd("print_mode", "bridge")}
                className={`rounded-lg border p-3 text-left transition ${cfg.print_mode === "bridge" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
              >
                <div className="font-medium text-sm">PrintBridge / PC</div>
                <div className="text-xs text-muted-foreground">Computador Windows na loja envia o ticket à impressora.</div>
              </button>
              <button
                type="button"
                onClick={() => upd("print_mode", "android_direct")}
                className={`rounded-lg border p-3 text-left transition ${cfg.print_mode === "android_direct" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
              >
                <div className="font-medium text-sm">Android direto</div>
                <div className="text-xs text-muted-foreground">App Android no tablet imprime direto via TCP/IP — sem PC.</div>
              </button>
            </div>
          </div>

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
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="h-5 w-5" /> Instalação no restaurante (Windows)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
            <li>Escolha a <strong>unidade</strong> no selector acima e guarde IP/porta da impressora.</li>
            <li>Descarregue o pacote ZIP e extraia em <span className="font-mono">C:\kebab-print-bridge</span>.</li>
            <li>Copie o <span className="font-mono">.env</span> e cole a chave <strong>service_role</strong> do Supabase.</li>
            <li>No PC: duplo clique em <span className="font-mono">install-windows.bat</span>, depois <span className="font-mono">start-bridge.bat</span>.</li>
            <li>Aqui no painel: clique <strong>Imprimir teste</strong> — deve sair papel na cozinha.</li>
            <li>Se OK: no PC corra <span className="font-mono">install-service-windows.bat</span> (arranca com Windows).</li>
            <li>Confirme abaixo: <strong>Bridge activo</strong> e hora do último sinal.</li>
            <li>Repita tudo na <strong>outra loja</strong> com outro <span className="font-mono">STORE_ID</span> e outra impressora.</li>
          </ol>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <Button variant="default" className="w-full" asChild>
              <a href={BRIDGE_ZIP_URL} download="kebab-print-bridge.zip">
                <Download className="w-4 h-4 mr-2" /> Baixar bridge Windows
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => void copyEnvToClipboard()} disabled={copyingEnv}>
              {copyingEnv
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <Copy className="w-4 h-4 mr-2" />}
              Copiar .env
            </Button>
            <Button variant="outline" className="w-full" onClick={downloadEnvFile}>
              <Download className="w-4 h-4 mr-2" /> Descarregar .env
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => runTest("basic")}
              disabled={!!testing}
            >
              {testing === "basic"
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> A enviar...</>
                : <><Printer className="w-4 h-4 mr-2" /> Imprimir teste</>}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Guia completo dentro do ZIP: <span className="font-mono">README-WINDOWS.md</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Probar impresión</CardTitle></CardHeader>
        <CardContent className="space-y-3">
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
            <AlertTriangle className="w-5 h-5 text-accent-foreground" /> Como funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            As impressoras térmicas usam moradas internas da rede (ex. <span className="font-mono">192.168.x.x</span>).
            O site na nuvem não alcança a impressora directamente — por isso um PC na loja corre o
            <b> Print Bridge</b>, consulta a fila na nuvem e envia o ticket por cabo/rede local.
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Cliente/vendedor cria pedido → fica associado à unidade escolhida.</li>
            <li>O sistema coloca o ticket na fila de impressão dessa unidade.</li>
            <li>O Print Bridge no PC (com identificador da loja correcto) processa só jobs dessa unidade.</li>
            <li>O bridge envia o ticket 80 mm por TCP ({cfg.ip_address}:{cfg.port}).</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterPage;
