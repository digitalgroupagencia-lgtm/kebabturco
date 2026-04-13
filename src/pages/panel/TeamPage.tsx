import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Plus, Trash2, Shield } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface TeamMember {
  id: string;
  user_id: string;
  role: AppRole;
  email?: string;
  full_name?: string;
}

const roleLabels: Record<AppRole, { label: string; color: string }> = {
  admin_master: { label: "Admin Master", color: "bg-destructive" },
  restaurant_admin: { label: "Admin Restaurante", color: "bg-primary" },
  operator: { label: "Operador", color: "bg-accent text-accent-foreground" },
  kitchen: { label: "Cozinha", color: "bg-success" },
};

const TeamPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const storeId = roleData?.store_id;
  const tenantId = roleData?.tenant_id;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("operator");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (storeId) fetchMembers();
  }, [storeId]);

  const fetchMembers = async () => {
    if (!storeId) return;
    // Fetch user_roles for this store, then get profiles
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("id, user_id, role")
      .eq("store_id", storeId);

    if (error || !roles) { setLoading(false); return; }

    // Fetch profiles for these users
    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const membersData: TeamMember[] = roles.map((r) => {
      const profile = profiles?.find((p) => p.user_id === r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        full_name: profile?.full_name || undefined,
      };
    });

    setMembers(membersData);
    setLoading(false);
  };

  const addMember = async () => {
    if (!storeId || !tenantId || !newEmail.trim()) {
      toast.error("Email é obrigatório");
      return;
    }
    setSaving(true);

    try {
      // First try to sign up the user (will auto-confirm)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword || "TempPass123!",
        options: { data: { full_name: newName.trim() } },
      });

      let userId: string | undefined;

      if (signUpError) {
        // User might already exist - try to find them
        toast.error("Erro: " + signUpError.message);
        setSaving(false);
        return;
      }

      userId = signUpData.user?.id;
      if (!userId) {
        toast.error("Erro ao criar usuário");
        setSaving(false);
        return;
      }

      // Create user_role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole,
        tenant_id: tenantId,
        store_id: storeId,
      });

      if (roleError) {
        toast.error("Erro ao atribuir papel: " + roleError.message);
        setSaving(false);
        return;
      }

      toast.success(`Membro adicionado como ${roleLabels[newRole].label}!`);
      setDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("operator");
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message || "Erro inesperado");
    }
    setSaving(false);
  };

  const removeMember = async (member: TeamMember) => {
    if (member.user_id === user?.id) {
      toast.error("Você não pode remover a si mesmo!");
      return;
    }

    const { error } = await supabase.from("user_roles").delete().eq("id", member.id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Membro removido!");
    fetchMembers();
  };

  const updateRole = async (memberId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").update({ role }).eq("id", memberId);
    if (error) { toast.error("Erro ao atualizar papel"); return; }
    toast.success("Papel atualizado!");
    fetchMembers();
  };

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Equipe</h2>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma loja vinculada.</CardContent></Card>
      </div>
    );
  }

  const canManage = roleData?.role === "admin_master" || roleData?.role === "restaurant_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Equipe
        </h2>
        {canManage && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Membro
          </Button>
        )}
      </div>

      {/* Roles legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(roleLabels) as [AppRole, { label: string; color: string }][])
          .filter(([key]) => key !== "admin_master")
          .map(([key, val]) => (
            <Badge key={key} className={val.color}>{val.label}</Badge>
          ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Papel</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{m.full_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{m.email || m.user_id.slice(0, 8) + "..."}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManage && m.user_id !== user?.id ? (
                      <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as AppRole)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="restaurant_admin">Admin Restaurante</SelectItem>
                          <SelectItem value="operator">Operador</SelectItem>
                          <SelectItem value="kitchen">Cozinha</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={roleLabels[m.role].color}>{roleLabels[m.role].label}</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {m.user_id !== user?.id && (
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeMember(m)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Nenhum membro cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add member dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Adicionar Membro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do membro" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Senha temporária</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <Label>Papel</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant_admin">Admin Restaurante</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="kitchen">Cozinha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={addMember} disabled={saving}>
              {saving ? "Criando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
