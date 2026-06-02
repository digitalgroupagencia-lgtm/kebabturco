import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSellerModuleEnabled } from "@/hooks/useSellerModule";
import { useTenantBilling, fmtMoney } from "@/hooks/useTenantBilling";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, UserPlus, KeyRound, Power, Trash2, ShoppingBag, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Seller {
  role_id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  is_active: boolean;
}

const SellersPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const tenantId = roleData?.tenant_id;
  const storeId = roleData?.store_id;
  const { enabled: sellerEnabled, isLoading: sellerFlagLoading } = useSellerModuleEnabled(tenantId);
  const qc = useQueryClient();
  const billing = useTenantBilling(tenantId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const { data: sellers, isLoading } = useQuery({
    queryKey: ["sellers", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("id, user_id, created_at")
        .eq("tenant_id", tenantId!)
        .eq("role", "seller");
      if (!roles?.length) return [] as Seller[];
      const ids = roles.map((r) => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      return roles.map((r) => ({
        role_id: r.id,
        user_id: r.user_id,
        full_name: profs?.find((p) => p.user_id === r.user_id)?.full_name ?? null,
        created_at: r.created_at,
        is_active: true,
      })) as Seller[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["sellers-stats", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("orders")
        .select("seller_id, total, status")
        .eq("store_id", storeId!)
        .gte("created_at", since.toISOString())
        .neq("status", "cancelled");
      const map = new Map<string, { count: number; revenue: number }>();
      (data ?? []).forEach((o: any) => {
        if (!o.seller_id) return;
        const cur = map.get(o.seller_id) ?? { count: 0, revenue: 0 };
        cur.count++; cur.revenue += Number(o.total || 0);
        map.set(o.seller_id, cur);
      });
      return map;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.email.trim() || !form.password.trim()) throw new Error("E-mail e senha são obrigatórios");
      if (form.password.length < 6) throw new Error("Senha deve ter pelo menos 6 caracteres");
      if (!tenantId) throw new Error("Tenant não encontrado");
      const allowed = billing.data?.sellers_allowed ?? 1;
      const active = billing.data?.sellers_active ?? sellers?.length ?? 0;
      if (active >= allowed) {
        throw new Error(`Seu plano permite ${allowed} vendedor(es). Para adicionar mais, solicite um upgrade.`);
      }
      const { data, error } = await supabase.functions.invoke("create-tenant-user", {
        body: {
          email: form.email.trim(),
          password: form.password,
          full_name: form.name.trim() || null,
          role: "seller",
          tenant_id: tenantId,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Vendedor criado!");
      qc.invalidateQueries({ queryKey: ["sellers", tenantId] });
      qc.invalidateQueries({ queryKey: ["tenant-billing", tenantId] });
      setOpen(false);
      setForm({ name: "", email: "", password: "", phone: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vendedor removido");
      qc.invalidateQueries({ queryKey: ["sellers", tenantId] });
      qc.invalidateQueries({ queryKey: ["tenant-billing", tenantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!resetUserId || newPwd.length < 6) throw new Error("Nova senha deve ter 6+ caracteres");
      // We need an admin endpoint; reuse create-tenant-user pattern via service role isn't available client-side.
      // Workaround: ask user to re-create account or contact admin master. Instead we use Supabase password reset email.
      const u = sellers?.find((s) => s.user_id === resetUserId);
      if (!u) throw new Error("Vendedor não encontrado");
      // Send reset link - requires email; best UX is an admin reset endpoint, but for now we surface a clear message.
      throw new Error("Reset direto requer endpoint admin. Use 'Esqueci senha' na tela de login.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allowed = billing.data?.sellers_allowed ?? 1;
  const active = sellers?.length ?? 0;
  const overLimit = active >= allowed;

  if (sellerFlagLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sellerEnabled) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <Users className="w-10 h-10 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Módulo Vendedor desactivado</h2>
            <p className="text-sm text-muted-foreground">
              Este módulo é controlado pela plataforma. Contacte o administrador
              para o activar no seu restaurante.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> Vendedores</h2>
          <p className="text-sm text-muted-foreground">Funcionários que tiram pedidos pelo celular vinculando mesa e cliente.</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={overLimit}>
          <UserPlus className="w-4 h-4 mr-2" /> Novo vendedor
        </Button>
      </div>

      {/* Limite */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={overLimit ? "destructive" : "secondary"}>{active}/{allowed} vendedores</Badge>
            {overLimit && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Limite atingido — solicite upgrade
              </span>
            )}
          </div>
          {billing.data && (
            <div className="text-xs text-muted-foreground ml-auto">
              Mensalidade prevista: <b className="text-foreground">{fmtMoney(billing.data.monthly_total, billing.data.currency)}</b>
              {billing.data.extra_sellers > 0 && (
                <span> · inclui {billing.data.extra_sellers} vendedor(es) extra</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sellers?.map((s) => {
            const st = stats?.get(s.user_id);
            return (
              <Card key={s.role_id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{s.full_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">Desde {format(new Date(s.created_at), "dd/MM/yyyy")}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">Ativo</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-1 border-t border-border">
                    <div>
                      <p className="text-muted-foreground text-xs">Pedidos (30d)</p>
                      <p className="font-bold flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5" /> {st?.count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Faturamento</p>
                      <p className="font-bold">{fmtMoney(st?.revenue ?? 0, billing.data?.currency || "BRL")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setResetUserId(s.user_id); setNewPwd(""); }}>
                      <KeyRound className="w-3.5 h-3.5 mr-1" /> Senha
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (confirm(`Remover ${s.full_name || "vendedor"}?`)) remove.mutate(s.role_id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {sellers?.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum vendedor cadastrado. Crie o primeiro acima.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialog criar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo vendedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do vendedor" />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" autoCapitalize="none" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vendedor@restaurante.com" />
            </div>
            <div>
              <Label>Senha inicial *</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
              <p className="text-xs text-muted-foreground mt-1">Compartilhe com o vendedor — ele pode trocar depois.</p>
            </div>
            <div>
              <Label>Telefone (opcional)</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+55 11 ..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar vendedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset senha (placeholder) */}
      <Dialog open={!!resetUserId} onOpenChange={(v) => !v && setResetUserId(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader><DialogTitle>Redefinir senha</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            O reset direto requer um endpoint administrativo. Por enquanto, o vendedor pode usar
            "Esqueci minha senha" na tela de login para receber um e-mail de recuperação.
          </p>
          <DialogFooter>
            <Button onClick={() => setResetUserId(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellersPage;
