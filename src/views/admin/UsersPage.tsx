import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Users, Loader2, Shield, Building2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import CreateUserDialog from "@/components/admin/CreateUserDialog";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import PremiumEmptyState from "@/components/admin/premium/PremiumEmptyState";
import StaffGooglePendingSection from "@/components/staff/StaffGooglePendingSection";
import { DEFAULT_STORE_ID } from "@/lib/appMode";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
  tenant_id: string | null;
  store_id: string | null;
  created_at: string;
  full_name?: string | null;
}

const ROLE_LABEL: Record<AppRole, string> = {
  admin_master: "Admin Master",
  restaurant_admin: "Admin do Restaurante",
  operator: "Operador",
  kitchen: "Cozinha",
  seller: "Vendedor",
  manager: "Gerente",
  cashier: "Caixa",
  attendant: "Atendente",
  delivery: "Entregador",
};

const ROLE_DESC: Record<AppRole, string> = {
  admin_master: "Acesso total ao sistema",
  restaurant_admin: "Gerencia um tenant (todas as lojas)",
  operator: "Acesso ao painel de operações",
  kitchen: "Acesso à tela de cozinha",
  seller: "Tira pedidos pelo celular (mesa/cliente)",
  manager: "Gerente do restaurante",
  cashier: "Caixa do restaurante",
  attendant: "Atendente do balcão",
  delivery: "Entregador",
};

const UsersPage = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    user_id: "",
    role: "operator" as AppRole,
    tenant_id: "",
  });

  const { data: roles, isLoading } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // join manual com profiles para mostrar nomes
      const userIds = Array.from(new Set(rolesData.map((r) => r.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

      const nameMap: Record<string, string | null> = {};
      (profiles ?? []).forEach((p) => { nameMap[p.user_id] = p.full_name; });

      return rolesData.map((r) => ({ ...r, full_name: nameMap[r.user_id] ?? null })) as UserRoleRow[];
    },
  });

  const { data: tenants } = useQuery({
    queryKey: ["admin-tenants-for-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const tenantNameOf = (id: string | null) =>
    tenants?.find((t) => t.id === id)?.name ?? "—";

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.user_id) throw new Error("Informe o User ID (UUID do usuário)");
      const needsTenant = form.role === "restaurant_admin" || form.role === "operator" || form.role === "kitchen";
      if (needsTenant && !form.tenant_id) throw new Error("Selecione o tenant para este papel");

      const { error } = await supabase.from("user_roles").insert({
        user_id: form.user_id,
        role: form.role,
        tenant_id: needsTenant ? form.tenant_id : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Papel atribuído com sucesso");
      setOpen(false);
      setForm({ user_id: "", role: "operator", tenant_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Papel removido");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const needsTenant =
    form.role === "restaurant_admin" || form.role === "operator" || form.role === "kitchen";

  return (
    <div className="space-y-6 max-w-full">
      <PremiumPageHeader
        icon={Users}
        title="Usuários do sistema"
        subtitle="Atribua papéis e vincule usuários aos clientes (tenants)."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <CreateUserDialog />
            <Button variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Atribuir papel
            </Button>
          </div>
        }
      />

      <StaffGooglePendingSection
        storeId={DEFAULT_STORE_ID}
        onChanged={() => qc.invalidateQueries({ queryKey: ["admin-user-roles"] })}
      />

      <div className="hidden">
        <CreateUserDialog />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Atribuir papel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Atribuir papel a usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>User ID (UUID)</Label>
                <Input
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value.trim() })}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="font-mono text-sm"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O usuário precisa ter feito signup primeiro. Pegue o UUID em Backend → Users.
                </p>
              </div>
              <div>
                <Label>Papel</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        <div className="flex flex-col">
                          <span>{ROLE_LABEL[r]}</span>
                          <span className="text-xs text-muted-foreground">{ROLE_DESC[r]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsTenant && (
                <div>
                  <Label>Cliente (Tenant)</Label>
                  <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>
                      {tenants?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Salvando..." : "Atribuir papel"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {(roles ?? []).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              Nenhum papel atribuído ainda. Clique em "Atribuir papel" para começar.
            </CardContent>
          </Card>
        )}
        {roles?.map((r) => (
          <Card key={r.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    r.role === "admin_master" ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <Shield className={`w-5 h-5 ${r.role === "admin_master" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.full_name || "Sem nome"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {r.user_id}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(r.id)}
                  className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    r.role === "admin_master"
                      ? "bg-primary text-primary-foreground hover:bg-primary"
                      : ""
                  }
                  variant={r.role === "admin_master" ? "default" : "secondary"}
                >
                  {ROLE_LABEL[r.role]}
                </Badge>
                {r.tenant_id && (
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="w-3 h-3" />
                    {tenantNameOf(r.tenant_id)}
                  </Badge>
                )}
                {r.role === "admin_master" && (
                  <Badge variant="outline" className="text-xs">Acesso global</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este papel?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário perderá o acesso vinculado a este papel. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;
