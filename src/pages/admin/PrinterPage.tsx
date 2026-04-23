import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Printer, Save, Wifi, AlertTriangle, FileText } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type P = Tables<"printer_settings">;
const STORE_ID = "b0000000-0000-0000-0000-000000000001";

const PrinterPage = () => {
  const [p, setP] = useState<P | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [printingTest, setPrintingTest] = useState(false);

  useEffect(() => {
    supabase.from("printer_settings").select("*").eq("store_id", STORE_ID).maybeSingle()
      .then(({ data }) => { setP(data ?? null); setLoading(false); });
  }, []);

  const upd = (k: keyof P, v: any) => setP((x) => x ? { ...x, [k]: v } as P : x);

  const save = async () => {
    if (!p) {
      const { data, error } = await supabase.from("printer_settings").insert({
        store_id: STORE_ID, enabled: false, printer_name: "Cocina", port: 9100,
      }).select().maybeSingle();
      if (error) return toast.error(error.message);
      setP(data); toast.success("Configuración creada");
      return;
    }
    const { error } = await supabase.from("printer_settings").update({
      enabled: p.enabled, printer_name: p.printer_name, ip_address: p.ip_address,
      port: p.port, agent_endpoint: p.agent_endpoint,
    }).eq("store_id", STORE_ID);
    if (error) toast.error(error.message); else toast.success("Guardado");
  };

  const test = async () => {
    if (!p?.agent_endpoint) return toast.error("Configura primero el endpoint del agente local");
    setTesting(true);
    try {
      const r = await fetch(p.agent_endpoint + "/test", { method: "POST" });
      if (r.ok) {
        await supabase.from("printer_settings").update({ last_test_at: new Date().toISOString(), last_test_ok: true }).eq("store_id", STORE_ID);
        toast.success("Impresora respondió OK");
      } else throw new Error("HTTP " + r.status);
    } catch (e: any) {
      await supabase.from("printer_settings").update({ last_test_at: new Date().toISOString(), last_test_ok: false }).eq("store_id", STORE_ID);
      toast.error("Falló la prueba: " + e.message);
    } finally {
      setTesting(false);
    }
  };

  const printTest = async () => {
    setPrintingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("print-order", {
        body: {
          storeId: STORE_ID,
          orderNumber: "TEST",
          tableNumber: "0",
          orderType: "here",
          paymentMethod: "card",
          paymentPending: false,
          items: [{
            productName: "Ticket de prueba",
            quantity: 1,
            size: null,
            unitPrice: 0,
            totalPrice: 0,
            extras: [],
            removed: [],
          }],
          total: 0,
        },
      });
      if (error) throw error;
      if ((data as any)?.ok) toast.success("Ticket de prueba enviado");
      else if ((data as any)?.skipped) toast.warning("Impresión deshabilitada");
      else toast.error("Falló: " + JSON.stringify(data));
    } catch (e: any) {
      toast.error("Error: " + (e.message || e));
    } finally {
      setPrintingTest(false);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Printer className="h-5 w-5 sm:h-6 sm:w-6" /> Impresora ESC/POS</h2>
          <p className="text-sm text-muted-foreground mt-1">Conecta la impresora del establecimiento vía red local.</p>
        </div>
        <Button onClick={save} className="w-full sm:w-auto"><Save className="w-4 h-4 mr-2" /> Guardar</Button>
      </div>

      <Card className="border-accent/40 bg-accent/10">
        <CardContent className="pt-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Cómo funciona</p>
            <p className="text-muted-foreground mt-1">
              IPs locales (ej. 192.168.x.x) no son accesibles desde la nube. Necesitas un pequeño <b>agente local</b> corriendo
              en la misma red de la impresora que reciba los pedidos por HTTPS y los reenvíe vía ESC/POS al IP configurado.
              Aquí guardas <b>la URL pública del agente</b> + IP/puerto de la impresora.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Configuración</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Impresión automática</Label>
              <p className="text-xs text-muted-foreground">Imprime cada pedido confirmado</p>
            </div>
            <Switch checked={p?.enabled ?? false} onCheckedChange={(v) => upd("enabled", v)} />
          </div>
          <div>
            <Label>Nombre / Sector</Label>
            <Input value={p?.printer_name ?? ""} onChange={(e) => upd("printer_name", e.target.value)} placeholder="Ej: Cocina" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label>IP de la impresora</Label>
              <Input value={p?.ip_address ?? ""} onChange={(e) => upd("ip_address", e.target.value)} placeholder="192.168.1.50" inputMode="numeric" />
            </div>
            <div className="min-w-0">
              <Label>Puerto</Label>
              <Input type="number" value={p?.port ?? 9100} onChange={(e) => upd("port", Number(e.target.value))} />
            </div>
          </div>
          <div className="min-w-0">
            <Label>URL pública del agente local</Label>
            <Input value={p?.agent_endpoint ?? ""} onChange={(e) => upd("agent_endpoint", e.target.value)} placeholder="https://printer-agent.tudominio.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground mt-1">Endpoint HTTPS expuesto del agente que está dentro del local.</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-2">
            <Button variant="outline" onClick={test} disabled={testing} className="w-full sm:w-auto">
              <Wifi className="w-4 h-4 mr-2" /> {testing ? "Probando..." : "Probar conexión"}
            </Button>
            <Button variant="outline" onClick={printTest} disabled={printingTest} className="w-full sm:w-auto">
              <FileText className="w-4 h-4 mr-2" /> {printingTest ? "Imprimiendo..." : "Imprimir prueba"}
            </Button>
            {p?.last_test_at && (
              <span className="text-xs text-muted-foreground sm:ml-2">
                Última prueba: {new Date(p.last_test_at).toLocaleString()} — {p.last_test_ok ? "OK" : "Falló"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterPage;