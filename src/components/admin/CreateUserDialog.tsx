import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLES: { value: AppRole; label: string; needsTenant: boolean }[] = [
  { value: "admin_master", label: "Admin Master (acesso global)", needsTenant: false },
  { value: "restaurant_admin", label: "Dono do Restaurante", needsTenant: true },
  { value: "operator", label: "Operador", needsTenant: true },
  { value: "kitchen", label: "Cozinha", needsTenant: true },
];

interface Props {
  defaultTenantId?: string;
  trigger?: React.ReactNode;
}

export default function CreateUserDialog({ defaultTenantId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("restaurant_admin");
  const [tenantId, setTenantId] = useState<string>(defaultTenantId ?? "");
  const qc = useQueryClient();

  const { data: tenants } = useQuery({
    queryKey: ["tenants-list-for-create-user"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: open && !defaultTenantId,
  });

  const createUser = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !password.trim()) throw new Error("E-mail e senha são obrigatórios");
      if (password.length < 6) throw new Error("Senha deve ter pelo menos 6 caracteres");
      const needsTenant = ROLES.find((r) => r.value === role)?.needsTenant;
      if (needsTenant && !tenantId) throw new Error("Selecione o cliente");

      const { data, error } = await supabase.functions.invoke("create-tenant-user", {
        body: {
          email: email.trim(),
          password,
          full_name: fullName.trim() || null,
          role,
          tenant_id: needsTenant ? tenantId : null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
      qc.invalidateQueries({ queryKey: ["tenant-users"] });
      toast.success("Usuário criado!");
      setOpen(false);
      setEmail(""); setPassword(""); setFullName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const needsTenant = ROLES.find((r) => r.value === role)?.needsTenant;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button><UserPlus className="w-4 h-4 mr-2" /> Novo usuário</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do dono" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dono@restaurante.com" autoCapitalize="none" />
          </div>
          <div>
            <Label>Senha temporária</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            <p className="text-xs text-muted-foreground mt-1">Compartilhe esta senha com o usuário. Ele pode trocar depois.</p>
          </div>
          <div>
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {needsTenant && !defaultTenantId && (
            <div>
              <Label>Cliente vinculado</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tenants?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button className="w-full" onClick={() => createUser.mutate()} disabled={createUser.isPending}>
            {createUser.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando…</> : "Criar usuário"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}