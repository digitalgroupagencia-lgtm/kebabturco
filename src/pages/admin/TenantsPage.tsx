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
import { toast } from "sonner";
import { Plus, Pencil, Store, Loader2 } from "lucide-react";

interface TenantForm {
  name: string;
  slug: string;
  plan: string;
  max_orders_month: number;
  is_active: boolean;
}

const emptyForm: TenantForm = { name: "", slug: "", plan: "free", max_orders_month: 500, is_active: true };

const planOptions = [
  { value: "free", label: "Free", limit: 500 },
  { value: "starter", label: "Starter", limit: 2000 },
  { value: "pro", label: "Pro", limit: 10000 },
  { value: "enterprise", label: "Enterprise", limit: 99999 },
];

const TenantsPage = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
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

  const saveMutation = useMutation({
    mutationFn: async (tenant: TenantForm & { id?: string }) => {
      if (tenant.id) {
        const { error } = await supabase.from("tenants").update({
          name: tenant.name, slug: tenant.slug, plan: tenant.plan,
          max_orders_month: tenant.max_orders_month, is_active: tenant.is_active,
        }).eq("id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenants").insert({
          name: tenant.name, slug: tenant.slug, plan: tenant.plan,
          max_orders_month: tenant.max_orders_month, is_active: tenant.is_active,
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
    setForm({ name: t.name, slug: t.slug, plan: t.plan || "free", max_orders_month: t.max_orders_month || 500, is_active: t.is_active });
    setOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clientes (Tenants)</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
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

      <div className="grid gap-4">
        {tenants?.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">/{t.slug}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Store className="w-3 h-3" /> {storeCounts?.[t.id] ?? 0} lojas
                  </div>
                </div>
                <Badge variant={t.is_active ? "default" : "secondary"}>
                  {t.is_active ? "Ativo" : "Inativo"}
                </Badge>
                <Badge variant="outline" className="capitalize">{t.plan || "free"}</Badge>
                <div className="text-xs text-muted-foreground">{t.max_orders_month} ped/mês</div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TenantsPage;
