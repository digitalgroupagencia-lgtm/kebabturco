import { useEffect, useState } from "react";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSellerModuleEnabled } from "@/hooks/useSellerModule";
import { useStaffT } from "@/hooks/useStaffT";
import { useTenantBilling, fmtMoney } from "@/hooks/useTenantBilling";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SecretInput } from "@/components/ui/secret-input";
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
  const { t } = useStaffT();
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
      if (!form.email.trim() || !form.password.trim()) throw new Error(t("sellers.err.email_password"));
      if (form.password.length < 6) throw new Error(t("sellers.err.password_short"));
      if (!tenantId) throw new Error(t("sellers.err.tenant"));
      const allowed = billing.data?.sellers_allowed ?? 1;
      const active = billing.data?.sellers_active ?? sellers?.length ?? 0;
      if (active >= allowed) {
        throw new Error(t("sellers.err.plan_limit").replace("{n}", String(allowed)));
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
      toast.success(t("sellers.toast.created"));
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
      toast.success(t("sellers.toast.removed"));
      qc.invalidateQueries({ queryKey: ["sellers", tenantId] });
      qc.invalidateQueries({ queryKey: ["tenant-billing", tenantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!resetUserId || newPwd.length < 6) throw new Error(t("sellers.err.password_short"));
      const u = sellers?.find((s) => s.user_id === resetUserId);
      if (!u) throw new Error(t("sellers.err.tenant"));
      throw new Error(t("sellers.reset.body"));
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
            <h2 className="text-xl font-bold">{t("page.sellers.disabled.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("page.sellers.disabled.body")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PremiumPageHeader
        icon={Users}
        title={t("page.sellers.title")}
        subtitle={t("page.sellers.subtitle")}
        actions={
          <Button onClick={() => setOpen(true)} disabled={overLimit} size="sm" className="h-9">
            <UserPlus className="w-4 h-4 mr-2" /> {t("page.sellers.new")}
          </Button>
        }
      />

      {/* Limite */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={overLimit ? "destructive" : "secondary"}>{active}/{allowed} {t("sellers.units")}</Badge>
            {overLimit && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {t("sellers.limit_reached")}
              </span>
            )}
          </div>
          {billing.data && (
            <div className="text-xs text-muted-foreground ml-auto">
              {t("sellers.monthly")} <b className="text-foreground">{fmtMoney(billing.data.monthly_total, billing.data.currency)}</b>
              {billing.data.extra_sellers > 0 && (
                <span> · {t("sellers.includes_extra").replace("{n}", String(billing.data.extra_sellers))}</span>
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
                      <p className="font-bold truncate">{s.full_name || t("sellers.no_name")}</p>
                      <p className="text-xs text-muted-foreground">{t("sellers.since")} {format(new Date(s.created_at), "dd/MM/yyyy")}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{t("common.active")}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-1 border-t border-border">
                    <div>
                      <p className="text-muted-foreground text-xs">{t("sellers.kpi.orders")}</p>
                      <p className="font-bold flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5" /> {st?.count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t("sellers.kpi.revenue")}</p>
                      <p className="font-bold">{fmtMoney(st?.revenue ?? 0, billing.data?.currency || "BRL")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setResetUserId(s.user_id); setNewPwd(""); }}>
                      <KeyRound className="w-3.5 h-3.5 mr-1" /> {t("sellers.action.password")}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (confirm(t("sellers.confirm.remove").replace("{name}", s.full_name || t("sellers.fallback.name")))) remove.mutate(s.role_id); }}>
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
                {t("sellers.empty")}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialog criar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sellers.dialog.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("sellers.field.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("sellers.field.name.ph")} />
            </div>
            <div>
              <Label>{t("sellers.field.email")}</Label>
              <Input type="email" autoCapitalize="none" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t("sellers.field.email.ph")} />
            </div>
            <div>
              <Label>{t("sellers.field.password")}</Label>
              <SecretInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t("sellers.field.password.ph")} />
              <p className="text-xs text-muted-foreground mt-1">{t("sellers.field.password.note")}</p>
            </div>
            <div>
              <Label>{t("sellers.field.phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+55 11 ..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("sellers.action.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset senha (placeholder) */}
      <Dialog open={!!resetUserId} onOpenChange={(v) => !v && setResetUserId(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("sellers.reset.title")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("sellers.reset.body")}
          </p>
          <DialogFooter>
            <Button onClick={() => setResetUserId(null)}>{t("sellers.reset.ok")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellersPage;
