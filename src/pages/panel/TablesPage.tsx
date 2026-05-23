import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, QrCode, Printer, LayoutGrid } from "lucide-react";
import { getTableQrUrl, type TenantUrlConfig } from "@/lib/tenantUrls";

type TableRow = {
  id: string;
  number: string;
  capacity: number;
  is_active: boolean;
};

const TablesPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { tenant: ctxTenant } = useSelectedTenant();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const [qrTable, setQrTable] = useState<TableRow | null>(null);
  const [tenantMeta, setTenantMeta] = useState<TenantUrlConfig>({
    slug: "",
    custom_domain: null,
    path_slug: null,
    master_domain: null,
    use_master_domain: false,
  });

  useEffect(() => {
    if (ctxTenant) {
      setTenantMeta({
        slug: ctxTenant.slug,
        custom_domain: ctxTenant.custom_domain,
        path_slug: ctxTenant.path_slug,
        master_domain: ctxTenant.master_domain,
        use_master_domain: ctxTenant.use_master_domain,
      });
      return;
    }
    if (!storeId) return;
    supabase.from("stores").select("tenant_id").eq("id", storeId).maybeSingle().then(async ({ data }) => {
      if (!data?.tenant_id) return;
      const { data: t } = await supabase
        .from("tenants")
        .select("slug, custom_domain, path_slug, master_domain, use_master_domain")
        .eq("id", data.tenant_id)
        .maybeSingle();
      if (t) {
        setTenantMeta({
          slug: t.slug,
          custom_domain: t.custom_domain,
          path_slug: t.path_slug,
          master_domain: t.master_domain,
          use_master_domain: t.use_master_domain ?? false,
        });
      }
    });
  }, [storeId, ctxTenant]);

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tables")
      .select("id, number, capacity, is_active")
      .eq("store_id", storeId)
      .order("number");
    if (error) toast.error(error.message);
    else setTables(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [storeId]);

  const addTable = async () => {
    if (!storeId || !newNumber.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("tables").insert({
      store_id: storeId,
      number: newNumber.trim(),
      capacity: parseInt(newCapacity, 10) || 4,
      is_active: true,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Mesa adicionada");
      setNewNumber("");
      load();
    }
  };

  const toggleActive = async (t: TableRow, active: boolean) => {
    const { error } = await supabase.from("tables").update({ is_active: active }).eq("id", t.id);
    if (error) toast.error(error.message);
    else load();
  };

  const printQr = () => {
    if (!qrTable) return;
    const url = getTableQrUrl(tenantMeta, qrTable.number);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Mesa ${qrTable.number}</title></head><body style="text-align:center;font-family:sans-serif;padding:40px"><h1>Mesa ${qrTable.number}</h1><div id="q"></div><p style="word-break:break-all;font-size:12px;margin-top:16px">${url}</p><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script><script>new QRCode(document.getElementById("q"),{text:${JSON.stringify(url)},width:256,height:256});setTimeout(()=>window.print(),500);<\/script></body></html>`);
    w.document.close();
  };

  if (storeLoading || loading) {
    return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> A carregar mesas...</div>;
  }

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">Nenhuma loja vinculada.</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutGrid className="h-6 w-6 text-primary" /> Gestão de mesas</h1>
        <p className="text-sm text-muted-foreground mt-1">Adicione mesas, active/desactive e imprima o QR code de cada uma.</p>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-bold">Nova mesa</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Número</Label>
            <Input value={newNumber} onChange={(e) => setNewNumber(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="3" />
          </div>
          <div>
            <Label>Lugares</Label>
            <Input type="number" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={addTable} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tables.map((t) => {
          const qrUrl = getTableQrUrl(tenantMeta, t.number);
          return (
            <Card key={t.id} className={`p-4 space-y-3 ${!t.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-primary">Mesa {t.number}</span>
                <Switch checked={t.is_active} onCheckedChange={(v) => toggleActive(t, v)} />
              </div>
              <p className="text-sm text-muted-foreground">{t.capacity} lugares · {t.is_active ? "Activa" : "Inactiva"}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setQrTable(t)}>
                  <QrCode className="h-4 w-4" /> Ver QR
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground break-all">{qrUrl}</p>
            </Card>
          );
        })}
      </div>

      {tables.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Nenhuma mesa registada. Adicione a primeira acima.</Card>
      )}

      <Dialog open={!!qrTable} onOpenChange={() => setQrTable(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mesa {qrTable?.number}</DialogTitle>
          </DialogHeader>
          {qrTable && (
            <div className="flex flex-col items-center gap-4">
              <QRCodeSVG value={getTableQrUrl(tenantMeta, qrTable.number)} size={220} />
              <p className="text-xs text-muted-foreground text-center break-all">
                {getTableQrUrl(tenantMeta, qrTable.number)}
              </p>
              <Button onClick={printQr} className="w-full gap-2"><Printer className="h-4 w-4" /> Imprimir QR</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablesPage;
