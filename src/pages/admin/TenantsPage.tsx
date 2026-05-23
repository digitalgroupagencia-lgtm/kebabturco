import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Pencil, Store, Loader2, Building2, AlertTriangle, CheckCircle2, Sparkles, Globe, ArrowRight, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import NewTenantWizard from "@/components/admin/NewTenantWizard";
import TenantQrDialog from "@/components/admin/TenantQrDialog";
import TenantLanguagesDialog from "@/components/admin/TenantLanguagesDialog";
import DuplicateTenantDialog from "@/components/admin/DuplicateTenantDialog";
import { useNavigate } from "react-router-dom";

interface TenantForm {
  name: string;
  slug: string;
  plan: string;
  max_orders_month: number;
  is_active: boolean;
  custom_domain: string;
}

const emptyForm: TenantForm = { name: "", slug: "", plan: "free", max_orders_month: 500, is_active: true, custom_domain: "" };

const planOptions = [
  { value: "free", label: "Free", limit: 500 },
  { value: "starter", label: "Starter", limit: 2000 },
  { value: "pro", label: "Pro", limit: 10000 },
  { value: "enterprise", label: "Enterprise", limit: 99999 },
];

const TenantsPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("is_template", false).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: storeCounts } = useQuery({
    queryKey: ["admin-store-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, tenant_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((s) => { counts[s.tenant_id] = (counts[s.tenant_id] || 0) + 1; });
      return counts;
    },
  });

  // Uso mensal real por tenant (pedidos do mês corrente, não cancelados)
  const { data: usageMap } = useQuery({
    queryKey: ["admin-tenant-usage"],
    queryFn: async () => {
      const firstDay = new Date();
      firstDay.setDate(1);
      firstDay.setHours(0, 0, 0, 0);
      const [{ data: stores }, { data: orders }] = await Promise.all([
        supabase.from("stores").select("id, tenant_id"),
        supabase.from("orders").select("store_id, status").gte("created_at", firstDay.toISOString()),
      ]);
      const storeToTenant: Record<string, string> = {};
      (stores ?? []).forEach((s) => { storeToTenant[s.id] = s.tenant_id; });
      const counts: Record<string, number> = {};
      (orders ?? []).forEach((o) => {
        if (o.status === "cancelled") return;
        const tid = storeToTenant[o.store_id];
        if (tid) counts[tid] = (counts[tid] || 0) + 1;
      });
      return counts;
    },
    refetchInterval: 60000,
  });

  const saveMutation = useMutation({
    mutationFn: async (tenant: TenantForm & { id?: string }) => {
      if (tenant.id) {
        const { error } = await supabase.from("tenants").update({
          name: tenant.name, slug: tenant.slug, plan: tenant.plan,
          max_orders_month: tenant.max_orders_month, is_active: tenant.is_active,
          custom_domain: tenant.custom_domain || null,
        }).eq("id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenants").insert({
          name: tenant.name, slug: tenant.slug, plan: tenant.plan,
          max_orders_month: tenant.max_orders_month, is_active: tenant.is_active,
          custom_domain: tenant.custom_domain || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success(editId ? "Cliente atualizado!" : "Cliente criado!");
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({ name: t.name, slug: t.slug, plan: t.plan || "free", max_orders_month: t.max_orders_month || 500, is_active: t.is_active, custom_domain: t.custom_domain || "" });
    setOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Clientes (Tenants)</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link to="/admin/domains">
              <Link2 className="mr-2 h-4 w-4" /> Domínios & Links
            </Link>
          </Button>
          <NewTenantWizard
            trigger={
              <Button variant="default" className="w-full sm:w-auto bg-primary">
                <Sparkles className="mr-2 h-4 w-4" /> Novo cliente com IA
              </Button>
            }
          />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} variant="outline" className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Manual</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="meu-restaurante" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Domínio próprio</Label>
                <Input value={form.custom_domain} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })} placeholder="pedido.restaurante.com" />
                <p className="text-xs text-muted-foreground mt-1">Aponte o DNS deste domínio para o sistema. Ao acessar, abrirá direto neste cliente.</p>
              </div>
              <div>
                <Label>Plano</Label>
                <Select value={form.plan} onValueChange={(v) => {
                  const opt = planOptions.find((p) => p.value === v);
                  setForm({ ...form, plan: v, max_orders_month: opt?.limit ?? 500 });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {planOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label} ({p.limit} pedidos/mês)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Limite pedidos/mês</Label>
                <Input type="number" value={form.max_orders_month} onChange={(e) => setForm({ ...form, max_orders_month: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Ativo</Label>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate({ ...form, id: editId ?? undefined })} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-3">
        {tenants?.map((t) => {
          const used = usageMap?.[t.id] ?? 0;
          const limit = t.max_orders_month ?? 500;
          const pct = Math.min((used / Math.max(limit, 1)) * 100, 100);
          const overLimit = used >= limit;
          const nearLimit = !overLimit && pct >= 80;
          return (
            <Card key={t.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      t.is_active ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Building2 className={`w-5 h-5 ${t.is_active ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground truncate">/{t.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <TenantQrDialog
                      tenantName={t.name}
                      tenantSlug={t.slug}
                      customDomain={(t as any).custom_domain}
                      pathSlug={(t as any).path_slug}
                      masterDomain={(t as any).master_domain}
                      useMasterDomain={(t as any).use_master_domain}
                    />
                    <TenantLanguagesDialog tenantId={t.id} tenantName={t.name} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate(`/admin/tenants/${t.slug}`)}
                  >
                    Acessar projeto <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                  <DuplicateTenantDialog sourceTenantId={t.id} sourceName={t.name} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {t.is_active ? (
                    <Badge className="bg-success text-success-foreground hover:bg-success gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">Inativo</Badge>
                  )}
                  <Badge variant="outline" className="capitalize">{t.plan || "free"}</Badge>
                  <Badge variant="outline" className="gap-1">
                    <Store className="w-3 h-3" /> {storeCounts?.[t.id] ?? 0} {(storeCounts?.[t.id] ?? 0) === 1 ? "loja" : "lojas"}
                  </Badge>
                  {(t as any).custom_domain && (
                    <Badge variant="outline" className="gap-1 max-w-[200px] truncate">
                      <Globe className="w-3 h-3 shrink-0" /> {(t as any).custom_domain}
                    </Badge>
                  )}
                  {overLimit && (
                    <Badge className="bg-destructive text-destructive-foreground gap-1">
                      <AlertTriangle className="w-3 h-3" /> Limite atingido
                    </Badge>
                  )}
                  {nearLimit && (
                    <Badge variant="outline" className="border-accent text-accent-foreground bg-accent/10 gap-1">
                      <AlertTriangle className="w-3 h-3" /> {Math.round(pct)}% do limite
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Uso mensal</span>
                    <span className="font-medium tabular-nums">{used} / {limit} pedidos</span>
                  </div>
                  <Progress
                    value={pct}
                    className={overLimit ? "[&>div]:bg-destructive" : nearLimit ? "[&>div]:bg-accent" : ""}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TenantsPage;
