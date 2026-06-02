import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useStaffT } from "@/hooks/useStaffT";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  QrCode,
  Printer,
  LayoutGrid,
  Copy,
  Download,
  RefreshCw,
  Layers,
} from "lucide-react";
import { getTableQrUrl, type TenantUrlConfig } from "@/lib/tenantUrls";
import { regenerateTableQrToken } from "@/services/orderService";
import PremiumTableQrPreview from "@/components/tableQr/PremiumTableQrPreview";
import { downloadTableQrPng, printTableQrCards, type TableQrExportInput } from "@/lib/tableQr/exportTableQr";
import { normalizeTableQrLang, type TableQrBranding } from "@/lib/tableQr/labels";

type TableRow = {
  id: string;
  number: string;
  capacity: number;
  is_active: boolean;
  qr_token: string;
};

const TablesPage = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const canManage = isAdmin;
  const { t } = useStaffT();

  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { tenant: ctxTenant } = useSelectedTenant();
  const { settings } = useBranding();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const [bulkFrom, setBulkFrom] = useState("1");
  const [bulkTo, setBulkTo] = useState("30");
  const [qrTable, setQrTable] = useState<TableRow | null>(null);
  const [primaryLang, setPrimaryLang] = useState("es");
  const [tenantMeta, setTenantMeta] = useState<TenantUrlConfig>({
    slug: "",
    custom_domain: null,
    path_slug: null,
    master_domain: null,
    use_master_domain: false,
  });

  const branding: TableQrBranding = useMemo(
    () => ({
      restaurantName: settings?.company_name || "Restaurante",
      logoUrl: settings?.logo_main_url || null,
      primaryLang: normalizeTableQrLang(primaryLang),
    }),
    [settings?.company_name, settings?.logo_main_url, primaryLang],
  );

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
    supabase
      .from("stores")
      .select("tenant_id")
      .eq("id", storeId)
      .maybeSingle()
      .then(async ({ data }) => {
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

  useEffect(() => {
    if (!storeId) return;
    supabase
      .from("totem_config")
      .select("primary_language")
      .eq("store_id", storeId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.primary_language) setPrimaryLang(String(data.primary_language));
      });
  }, [storeId]);

  const tableQrUrl = (table: TableRow) =>
    getTableQrUrl(tenantMeta, { number: table.number, qr_token: table.qr_token }, { lang: primaryLang });

  const exportInput = (table: TableRow): TableQrExportInput => ({
    tableNumber: table.number,
    url: tableQrUrl(table),
    branding,
  });

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tables")
      .select("id, number, capacity, is_active, qr_token")
      .eq("store_id", storeId)
      .order("number");
    if (error) toast.error(error.message);
    else setTables(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const addTable = async () => {
    if (!canManage || !storeId || !newNumber.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("tables").insert({
      store_id: storeId,
      number: newNumber.trim(),
      capacity: parseInt(newCapacity, 10) || 4,
      is_active: true,
      qr_token: crypto.randomUUID(),
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t("tables.toast.added"));
      setNewNumber("");
      load();
    }
  };

  const bulkCreateTables = async () => {
    if (!canManage || !storeId) return;
    const from = Math.max(1, parseInt(bulkFrom, 10) || 1);
    const to = Math.max(from, parseInt(bulkTo, 10) || from);
    if (to - from > 60) {
      toast.error(t("tables.toast.bulk_max"));
      return;
    }
    setBulkSaving(true);
    const existing = new Set(tables.map((t) => t.number));
    let created = 0;
    for (let n = from; n <= to; n++) {
      const num = String(n);
      if (existing.has(num)) continue;
      const { error } = await supabase.from("tables").insert({
        store_id: storeId,
        number: num,
        capacity: 4,
        is_active: true,
        qr_token: crypto.randomUUID(),
      });
      if (!error) created++;
    }
    setBulkSaving(false);
    toast.success(created ? t("tables.toast.bulk_created").replace("{n}", String(created)) : t("tables.toast.bulk_none"));
    load();
  };

  const toggleActive = async (tbl: TableRow, active: boolean) => {
    if (!canManage) return;
    const { error } = await supabase.from("tables").update({ is_active: active }).eq("id", tbl.id);
    if (error) toast.error(error.message);
    else load();
  };

  const copyLink = async (table: TableRow) => {
    try {
      await navigator.clipboard.writeText(tableQrUrl(table));
      toast.success(t("tables.toast.link_copied").replace("{n}", table.number));
    } catch {
      toast.error(t("tables.toast.link_error"));
    }
  };

  const downloadPremiumPng = async (table: TableRow) => {
    try {
      await downloadTableQrPng(exportInput(table), `${branding.restaurantName}-mesa-${table.number}.png`);
      toast.success(t("tables.toast.png_ok").replace("{n}", table.number));
    } catch {
      toast.error(t("tables.toast.png_error"));
    }
  };

  const regenerateQr = async (table: TableRow) => {
    if (!canManage) return;
    if (!window.confirm(t("tables.toast.regen_confirm").replace("{n}", table.number))) return;
    setRegeneratingId(table.id);
    try {
      const newToken = await regenerateTableQrToken(table.id);
      const updated = { ...table, qr_token: newToken };
      setTables((prev) => prev.map((t) => (t.id === table.id ? updated : t)));
      if (qrTable?.id === table.id) setQrTable(updated);
      toast.success(t("tables.toast.regen_ok").replace("{n}", table.number));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("tables.toast.regen_error"));
    } finally {
      setRegeneratingId(null);
    }
  };

  const printPremiumQr = async (table: TableRow) => {
    await printTableQrCards([exportInput(table)], `${t("tables.table_n")} ${table.number}`);
  };

  const downloadAllPremium = async () => {
    const active = tables.filter((t) => t.is_active);
    if (!active.length) {
      toast.error(t("tables.toast.no_active"));
      return;
    }
    await printTableQrCards(
      active.map(exportInput),
      `QR Codes — ${branding.restaurantName}`,
    );
    toast.success(t("tables.toast.batch_ready").replace("{n}", String(active.length)));
  };

  if (storeLoading || loading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> {t("tables.loading")}
      </div>
    );
  }

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">{t("common.no_store")}</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" /> {t("page.tables.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            QR codes premium com número da mesa, idioma principal ({primaryLang.toUpperCase()}) e token único
            de segurança. Disponível na administração e no painel do restaurante.
          </p>
        </div>
        {tables.some((t) => t.is_active) && (
          <Button variant="outline" className="gap-2 shrink-0" onClick={downloadAllPremium}>
            <Printer className="h-4 w-4" /> Imprimir / PDF — todas
          </Button>
        )}
      </div>

      {canManage && (
        <>
          <Card className="p-4 space-y-3">
            <h2 className="font-bold">Nova mesa</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Número / nome</Label>
                <Input
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="3"
                />
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

          <Card className="p-4 space-y-3">
            <h2 className="font-bold flex items-center gap-2">
              <Layers className="h-4 w-4" /> Criar lote de mesas
            </h2>
            <p className="text-xs text-muted-foreground">Ex.: Mesa 1 até Mesa 30 — só cria as que ainda não existem.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>De</Label>
                <Input value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value.replace(/\D/g, "").slice(0, 3))} />
              </div>
              <div>
                <Label>Até</Label>
                <Input value={bulkTo} onChange={(e) => setBulkTo(e.target.value.replace(/\D/g, "").slice(0, 3))} />
              </div>
              <div className="flex items-end">
                <Button onClick={bulkCreateTables} disabled={bulkSaving} variant="secondary" className="w-full gap-2">
                  {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                  Gerar mesas
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tables.map((t) => (
          <Card key={t.id} className={`p-4 space-y-3 ${!t.is_active ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black tracking-tight">Mesa {t.number}</span>
              {canManage ? (
                <Switch checked={t.is_active} onCheckedChange={(v) => toggleActive(t, v)} />
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">{t.is_active ? "Activa" : "Inactiva"}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{t.capacity} lugares</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1 min-w-[100px]" onClick={() => setQrTable(t)}>
                <QrCode className="h-4 w-4" /> Ver QR
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => copyLink(t)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadPremiumPng(t)}>
                <Download className="h-4 w-4" />
              </Button>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={regeneratingId === t.id}
                  onClick={() => regenerateQr(t)}
                >
                  {regeneratingId === t.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {tables.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          {canManage ? "Nenhuma mesa registada. Adicione a primeira acima." : "Nenhuma mesa registada."}
        </Card>
      )}

      <Dialog open={!!qrTable} onOpenChange={() => setQrTable(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR premium — Mesa {qrTable?.number}</DialogTitle>
          </DialogHeader>
          {qrTable && (
            <div className="flex flex-col items-center gap-4">
              <PremiumTableQrPreview
                tableNumber={qrTable.number}
                url={tableQrUrl(qrTable)}
                branding={branding}
              />
              <p className="text-[10px] text-muted-foreground text-center break-all">{tableQrUrl(qrTable)}</p>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="outline" onClick={() => copyLink(qrTable)} className="gap-2">
                  <Copy className="h-4 w-4" /> Copiar link
                </Button>
                <Button variant="outline" onClick={() => downloadPremiumPng(qrTable)} className="gap-2">
                  <Download className="h-4 w-4" /> Baixar PNG
                </Button>
                <Button onClick={() => printPremiumQr(qrTable)} className="col-span-2 gap-2">
                  <Printer className="h-4 w-4" /> Imprimir / PDF
                </Button>
                {canManage && (
                  <Button
                    variant="secondary"
                    className="col-span-2 gap-2"
                    disabled={regeneratingId === qrTable.id}
                    onClick={() => regenerateQr(qrTable)}
                  >
                    {regeneratingId === qrTable.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Regenerar token (invalida QR anterior)
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablesPage;
