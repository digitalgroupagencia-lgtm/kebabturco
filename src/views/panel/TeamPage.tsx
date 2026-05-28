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
import { translateAppErrorFromException, translateAppError } from "@/lib/authErrorMessages";
import { staffPasswordHint, suggestStaffPassword, validateStaffPassword } from "@/lib/staffPassword";
import {
  staffAccessPinHint,
  suggestStaffAccessPin,
  sanitizeStaffAccessPinInput,
  validateStaffAccessPin,
} from "@/lib/staffAccessPin";
import { useStoreLanguages } from "@/hooks/useStoreLanguages";
import StaffMemberWelcomeDialog from "@/components/panel/StaffMemberWelcomeDialog";
import type { StaffOnboardingInput } from "@/lib/staffOnboardingGuide";
import { createStaffMember } from "@/services/createStaffMember";

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
  const { primaryLang } = useStoreLanguages(storeId);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("operator");
  const [newLanguage, setNewLanguage] = useState<string>("es");
  const [newAccessPin, setNewAccessPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeData, setWelcomeData] = useState<StaffOnboardingInput | null>(null);
  const [pinDialogMember, setPinDialogMember] = useState<TeamMember | null>(null);
  const [editAccessPin, setEditAccessPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

  useEffect(() => {
    if (storeId) fetchMembers();
  }, [storeId]);

  useEffect(() => {
    if (primaryLang) setNewLanguage(primaryLang);
  }, [primaryLang]);

  const openAddDialog = () => {
    setNewLanguage(primaryLang || "es");
    setDialogOpen(true);
  };

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
    const { data: pinRows } = await (supabase
      .from("staff_access_pins" as any)
      .select("user_role_id, is_active")
      .in("user_role_id", roleIds) as any);

    const pinByRole = new Set(
      ((pinRows ?? []) as any[]).filter((p: any) => p.is_active).map((p: any) => p.user_role_id),
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

  const uiLang = (newLanguage === "es" ? "es" : "pt") as "pt" | "es";

  const addMember = async () => {
    if (!storeId || !tenantId || !newEmail.trim()) {
      toast.error(uiLang === "es" ? "El correo es obligatorio" : "Email é obrigatório");
      return;
    }
    const pinError = validateStaffAccessPin(newAccessPin, uiLang);
    if (pinError) {
      toast.error(pinError);
      return;
    }
    const passwordError = validateStaffPassword(newPassword, uiLang);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setSaving(true);

    try {
      const result = await createStaffMember({
        email: newEmail.trim(),
        password: newPassword,
        full_name: newName.trim() || null,
        role: newRole,
        store_id: storeId,
        tenant_id: tenantId,
        access_pin: newAccessPin,
        preferred_language: newLanguage,
      });

      toast.success(
        uiLang === "es"
          ? `Miembro añadido como ${roleLabels[newRole].label}`
          : `Membro adicionado como ${roleLabels[newRole].label}!`,
      );
      if (result.password_unchanged) {
        toast.info(
          uiLang === "es"
            ? "Este correo ya existía: se añadió al equipo, pero la contraseña anterior se mantiene."
            : "Este e-mail já existia: foi adicionado à equipa, mas a senha anterior mantém-se.",
        );
      }
      setWelcomeData({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        accessPin: newAccessPin,
        role: newRole,
        lang: uiLang,
        siteUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      setWelcomeOpen(true);
      setDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      setShowPassword(false);
      setNewName("");
      setNewRole("operator");
      setNewLanguage(primaryLang || "es");
      setNewAccessPin("");
      fetchMembers();
    } catch (e: unknown) {
      toast.error(translateAppErrorFromException(e, uiLang));
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
    const pinError = validateStaffAccessPin(editAccessPin, "pt");
    if (pinError) {
      toast.error(pinError);
      return;
    }
    setPinSaving(true);
    try {
      const { error } = await (supabase.rpc as any)("upsert_staff_access_pin", {
        _user_role_id: pinDialogMember.id,
        _pin: editAccessPin,
      });
      if (error) throw error;
      toast.success("Código actualizado!");
      setPinDialogMember(null);
      setEditAccessPin("");
      fetchMembers();
    } catch (e: unknown) {
      toast.error(translateAppErrorFromException(e, "pt"));
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
          <Button size="sm" onClick={openAddDialog}>
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
              <Label>Senha *</Label>
              <div className="flex gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setNewPassword(suggestStaffPassword());
                    setShowPassword(true);
                  }}
                >
                  Sugerir senha
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{staffPasswordHint(uiLang)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {uiLang === "es"
                  ? "Anote la contraseña y entréguela al empleado. También puede entrar con el código de acceso en el móvil."
                  : "Anote a senha e entregue ao funcionário. Ele também pode entrar com o código de acesso no telemóvel."}
              </p>
            </div>
            <div>
              <Label>Código de acesso *</Label>
              <div className="flex gap-2">
                <Input
                  value={newAccessPin}
                  onChange={(e) => setNewAccessPin(sanitizeStaffAccessPinInput(e.target.value))}
                  placeholder="Ex: 482917#"
                  className="flex-1 font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setNewAccessPin(suggestStaffAccessPin())}
                >
                  Sugerir código
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{staffAccessPinHint(uiLang)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {uiLang === "es"
                  ? "El empleado lo usa en «Área da equipe» (5 toques en el logo del menú). No es para clientes."
                  : "O funcionário usa na «Área da equipe» (5 toques no logótipo do menu). Não é para clientes."}
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
              <p className="text-xs text-muted-foreground mt-1">
                {uiLang === "es"
                  ? "Idioma principal del restaurante (español). El empleado puede cambiarlo con el icono 🌐."
                  : "Idioma principal do restaurante (espanhol). O funcionário pode mudar com o ícone 🌐."}
              </p>
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
            <Label>Novo código (6–10 caracteres com #)</Label>
            <div className="flex gap-2">
              <Input
                value={editAccessPin}
                onChange={(e) => setEditAccessPin(sanitizeStaffAccessPinInput(e.target.value))}
                placeholder="Ex: 482917#"
                className="font-mono flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setEditAccessPin(suggestStaffAccessPin())}>
                Sugerir
              </Button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={() => void saveMemberPin()} disabled={pinSaving}>
              {pinSaving ? "A guardar…" : "Guardar código"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StaffMemberWelcomeDialog open={welcomeOpen} data={welcomeData} onOpenChange={setWelcomeOpen} />
    </div>
  );
};

export default TeamPage;
