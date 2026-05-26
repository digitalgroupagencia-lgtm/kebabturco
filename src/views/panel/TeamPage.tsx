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
import { RESTAURANT_STAFF_ROLES, STAFF_ROLE_LABELS, canManageTeam, type StaffRole } from "@/lib/staffPermissions";

type AppRole = StaffRole;

interface TeamMember {
  id: string;
  user_id: string;
  role: AppRole;
  email?: string;
  full_name?: string;
  preferred_language?: string;
  hasAccessPin?: boolean;
}

const LANGUAGES = [
  { value: "pt", label: "🇧🇷 Português" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "en", label: "🇬🇧 English" },
  { value: "fr", label: "🇫🇷 Français" },
];

const roleLabels: Record<AppRole, { label: string; color: string }> = {
  admin_master: { label: STAFF_ROLE_LABELS.admin_master, color: "bg-destructive" },
  restaurant_admin: { label: STAFF_ROLE_LABELS.restaurant_admin, color: "bg-primary" },
  manager: { label: STAFF_ROLE_LABELS.manager, color: "bg-primary" },
  operator: { label: STAFF_ROLE_LABELS.operator, color: "bg-accent text-accent-foreground" },
  kitchen: { label: STAFF_ROLE_LABELS.kitchen, color: "bg-success" },
  cashier: { label: STAFF_ROLE_LABELS.cashier, color: "bg-yellow-600 text-white" },
  attendant: { label: STAFF_ROLE_LABELS.attendant, color: "bg-blue-600 text-white" },
  delivery: { label: STAFF_ROLE_LABELS.delivery, color: "bg-orange-600 text-white" },
  seller: { label: STAFF_ROLE_LABELS.seller, color: "bg-cta text-cta-foreground" },
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
  const [newLanguage, setNewLanguage] = useState<string>("pt");
  const [newAccessPin, setNewAccessPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [pinDialogMember, setPinDialogMember] = useState<TeamMember | null>(null);
  const [editAccessPin, setEditAccessPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

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
      .select("user_id, full_name, preferred_language")
      .in("user_id", userIds);

    const roleIds = roles.map((r) => r.id);
    const { data: pinRows } = await supabase
      .from("staff_access_pins")
      .select("user_role_id, is_active")
      .in("user_role_id", roleIds);

    const pinByRole = new Set(
      (pinRows ?? []).filter((p) => p.is_active).map((p) => p.user_role_id),
    );

    const membersData: TeamMember[] = roles.map((r) => {
      const profile = profiles?.find((p) => p.user_id === r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        full_name: profile?.full_name || undefined,
        preferred_language: (profile as any)?.preferred_language || "pt",
        hasAccessPin: pinByRole.has(r.id),
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
    if (!/^\d{4,8}$/.test(newAccessPin)) {
      toast.error("Código de acesso deve ter entre 4 e 8 dígitos");
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
      const { data: roleRow, error: roleError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole as any,
        tenant_id: tenantId,
        store_id: storeId,
      } as any).select("id").single();

      if (roleError || !roleRow?.id) {
        toast.error("Erro ao atribuir papel: " + (roleError?.message ?? "desconhecido"));
        setSaving(false);
        return;
      }

      const { error: pinError } = await supabase.rpc("upsert_staff_access_pin", {
        _user_role_id: roleRow.id,
        _pin: newAccessPin,
      });

      if (pinError) {
        toast.error("Erro ao definir código: " + pinError.message);
        setSaving(false);
        return;
      }

      // Save preferred language on profile
      await supabase.from("profiles").upsert(
        { user_id: userId, full_name: newName.trim() || null, preferred_language: newLanguage } as any,
        { onConflict: "user_id" }
      );

      toast.success(`Membro adicionado como ${roleLabels[newRole].label}!`);
      setDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("operator");
      setNewLanguage("pt");
      setNewAccessPin("");
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message || "Erro inesperado");
    }
    setSaving(false);
  };

  const updateLanguage = async (userId: string, lang: string) => {
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, preferred_language: lang } as any, { onConflict: "user_id" });
    if (error) { toast.error("Erro ao atualizar idioma"); return; }
    toast.success("Idioma atualizado!");
    fetchMembers();
  };

  const saveMemberPin = async () => {
    if (!pinDialogMember) return;
    if (!/^\d{4,8}$/.test(editAccessPin)) {
      toast.error("Código deve ter entre 4 e 8 dígitos");
      return;
    }
    setPinSaving(true);
    try {
      const { error } = await supabase.rpc("upsert_staff_access_pin", {
        _user_role_id: pinDialogMember.id,
        _pin: editAccessPin,
      });
      if (error) throw error;
      toast.success("Código actualizado!");
      setPinDialogMember(null);
      setEditAccessPin("");
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar código");
    } finally {
      setPinSaving(false);
    }
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
    const { error } = await supabase.from("user_roles").update({ role: role as any }).eq("id", memberId);
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

  const canManage = canManageTeam(roleData?.role);

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
                <TableHead>Código</TableHead>
                <TableHead>Idioma</TableHead>
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
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESTAURANT_STAFF_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {roleLabels[r]?.label ?? r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={roleLabels[m.role].color}>{roleLabels[m.role].label}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.hasAccessPin ? (
                      <Badge variant="secondary" className="font-mono">Activo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/40">Sem código</Badge>
                    )}
                    {canManage && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 ml-2 text-xs"
                        onClick={() => {
                          setPinDialogMember(m);
                          setEditAccessPin("");
                        }}
                      >
                        {m.hasAccessPin ? "Alterar" : "Definir"}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select value={m.preferred_language || "pt"} onValueChange={(v) => updateLanguage(m.user_id, v)}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">{LANGUAGES.find((l) => l.value === m.preferred_language)?.label || "🇧🇷 Português"}</span>
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
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
              <Label>Código de acesso *</Label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={newAccessPin}
                onChange={(e) => setNewAccessPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="Ex: 123456"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O funcionário usa este código na Área da equipe do app — não confundir com Meus pedidos do cliente.
              </p>
            </div>
            <div>
              <Label>Papel</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESTAURANT_STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabels[r]?.label ?? r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Idioma do sistema *</Label>
              <Select value={newLanguage} onValueChange={setNewLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Idioma em que este membro verá o painel.</p>
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

      <Dialog open={!!pinDialogMember} onOpenChange={(open) => !open && setPinDialogMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código de acesso — {pinDialogMember?.full_name || "Membro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Novo código (4 a 8 dígitos)</Label>
            <Input
              inputMode="numeric"
              value={editAccessPin}
              onChange={(e) => setEditAccessPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Ex: 456789"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={() => void saveMemberPin()} disabled={pinSaving}>
              {pinSaving ? "A guardar…" : "Guardar código"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
