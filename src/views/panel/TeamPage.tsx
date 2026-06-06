import { useState, useEffect, useRef } from "react";
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
import { Users, Plus, Trash2, Shield, Pencil, ClipboardCopy } from "lucide-react";
import { RESTAURANT_STAFF_ROLES, STAFF_ROLE_LABELS, canManageTeam, type StaffRole } from "@/lib/staffPermissions";
import { translateAppErrorFromException, translateAppError } from "@/lib/authErrorMessages";
import { staffPasswordHint, suggestStaffPassword, validateStaffPassword } from "@/lib/staffPassword";
import { useStoreLanguages } from "@/hooks/useStoreLanguages";
import { useStaffT } from "@/hooks/useStaffT";
import StaffMemberWelcomeDialog from "@/components/panel/StaffMemberWelcomeDialog";
import type { StaffOnboardingInput } from "@/lib/staffOnboardingGuide";
import { createStaffMember, verifyStaffMemberLogin } from "@/services/createStaffMember";
import { updateStaffMember } from "@/services/updateStaffMember";
import { useSellerModuleEnabled } from "@/hooks/useSellerModule";
import {
  loadTeamOnboardingCache,
  mergeOnboardingInput,
  saveTeamOnboardingCache,
} from "@/lib/teamOnboardingCache";
import { usePanelStore } from "@/contexts/PanelStoreContext";
import {
  clearTeamMemberDraft,
  loadTeamMemberDraft,
  saveTeamMemberDraft,
  teamMemberDraftHasContent,
} from "@/lib/teamMemberDraft";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumCard } from "@/components/premium/PremiumCard";
import { PremiumEmptyState } from "@/components/premium/PremiumEmptyState";
import { PremiumActionButton } from "@/components/premium/PremiumActionButton";

type AppRole = StaffRole;

interface TeamMember {
  id: string;
  user_id: string;
  role: AppRole;
  email?: string;
  full_name?: string;
  preferred_language?: string;
}

type EmailRow = { user_id: string; email: string };
type ProfileRow = { user_id: string; full_name: string | null; preferred_language: string | null };
type RoleRow = { id: string; user_id: string; role: AppRole; created_at: string };

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
  const { t } = useStaffT();
  const { roleData } = useUserRole(user?.id);
  const { storeId, stores, canSwitchStore } = usePanelStore();
  const tenantId = roleData?.tenant_id;
  const { enabled: sellerEnabled } = useSellerModuleEnabled(tenantId);
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
  const [saving, setSaving] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeMode, setWelcomeMode] = useState<"create" | "review">("create");
  const [welcomeData, setWelcomeData] = useState<StaffOnboardingInput | null>(null);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("operator");
  const [editLanguage, setEditLanguage] = useState("es");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const draftToastStoreRef = useRef<string | null>(null);

  useEffect(() => {
    if (storeId) {
      void fetchMembers();
    } else {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    const draft = loadTeamMemberDraft(storeId);
    if (!draft) {
      setHasDraft(false);
      return;
    }
    setNewName(draft.name);
    setNewEmail(draft.email);
    setNewPassword(draft.password);
    setNewRole(draft.role);
    setNewLanguage(draft.language);
    setHasDraft(true);
    setDialogOpen(true);
    if (draftToastStoreRef.current !== storeId) {
      draftToastStoreRef.current = storeId;
      toast.info(t("team.toast.draft_restored"));
    }
  }, [storeId]);

  useEffect(() => {
    if (primaryLang && !hasDraft) setNewLanguage(primaryLang);
  }, [primaryLang, hasDraft]);

  useEffect(() => {
    if (!storeId) return;
    const payload = {
      name: newName,
      email: newEmail,
      password: newPassword,
      role: newRole,
      language: newLanguage,
    };
    const timer = window.setTimeout(() => {
      if (teamMemberDraftHasContent(payload)) {
        saveTeamMemberDraft(storeId, payload);
        setHasDraft(true);
      } else {
        clearTeamMemberDraft(storeId);
        setHasDraft(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [storeId, newName, newEmail, newPassword, newRole, newLanguage]);

  const clearDraftForm = () => {
    if (storeId) clearTeamMemberDraft(storeId);
    setHasDraft(false);
    setNewEmail("");
    setNewPassword("");
    setShowPassword(false);
    setNewName("");
    setNewRole("operator");
    setNewLanguage(primaryLang || "es");
  };

  const openAddDialog = () => {
    if (!hasDraft) setNewLanguage(primaryLang || "es");
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
    const roleRows = (roles ?? []) as RoleRow[];
    const userIds = roleRows.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, preferred_language")
      .in("user_id", userIds);
    const profileRows = (profiles ?? []) as ProfileRow[];

    const emailByUser = new Map<string, string>();
    try {
      const { data: emailRows } = await supabase.rpc("get_store_team_member_emails", {
        _store_id: storeId,
      });
      ((emailRows ?? []) as EmailRow[]).forEach((row) => {
        if (row.user_id && row.email) emailByUser.set(row.user_id, row.email);
      });
    } catch {
      /* RPC opcional — emails vêm do cache local se indisponível */
    }

    const membersData: TeamMember[] = roleRows.map((r) => {
      const profile = profileRows.find((p) => p.user_id === r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        email: emailByUser.get(r.user_id),
        full_name: profile?.full_name || undefined,
        preferred_language: profile?.preferred_language || "pt",
      };
    });

    setMembers(membersData);
    setLoading(false);
  };

  const uiLang = (newLanguage === "es" ? "es" : "pt") as "pt" | "es";
  const panelLang = (primaryLang === "es" ? "es" : "pt") as "pt" | "es";

  const persistOnboardingCache = (
    memberRoleId: string,
    payload: {
      name: string;
      email: string;
      password: string;
      role: AppRole;
      lang: "pt" | "es";
    },
  ) => {
    if (!storeId) return;
    saveTeamOnboardingCache(storeId, memberRoleId, payload);
  };

  const showMemberInstructions = (member: TeamMember, mode: "create" | "review" = "review") => {
    if (!storeId) return;
    const cache = loadTeamOnboardingCache(storeId, member.id);
    const data = mergeOnboardingInput(member, cache, window.location.origin);
    setWelcomeMode(mode);
    setWelcomeData(data);
    setWelcomeOpen(true);
  };

  const openEditMember = (member: TeamMember) => {
    const cache = storeId ? loadTeamOnboardingCache(storeId, member.id) : null;
    setEditMember(member);
    setEditName(member.full_name || cache?.name || "");
    setEditPassword("");
    setEditRole(member.role);
    setEditLanguage(member.preferred_language || primaryLang || "es");
    setShowEditPassword(false);
  };

  const saveEditMember = async () => {
    if (!editMember || !storeId) return;
    const lang = (editLanguage === "es" ? "es" : "pt") as "pt" | "es";
    if (editPassword.trim()) {
      const passwordError = validateStaffPassword(editPassword, lang);
      if (passwordError) {
        toast.error(passwordError);
        return;
      }
    }

    setEditSaving(true);
    try {
      await updateStaffMember({
        user_id: editMember.user_id,
        user_role_id: editMember.id,
        store_id: storeId,
        email: editMember.email,
        full_name: editName.trim() || null,
        role: editRole,
        preferred_language: editLanguage,
        password: editPassword.trim() || undefined,
      });

      let loginReady = true;
      if (editPassword.trim() && editMember.email) {
        loginReady = await verifyStaffMemberLogin(editMember.email, editPassword.trim());
      }

      const cache = loadTeamOnboardingCache(storeId, editMember.id);
      persistOnboardingCache(editMember.id, {
        name: editName.trim(),
        email: editMember.email || cache?.email || "",
        password: editPassword.trim() || cache?.password || "",
        role: editRole,
        lang,
      });

      toast.success(t("team.toast.member_updated"));
      if (editPassword.trim() && !loginReady) {
        toast.warning(t("team.toast.login_pending_edit"), { duration: 8000 });
      }
      setEditMember(null);
      await fetchMembers();

      const updated: TeamMember = {
        ...editMember,
        full_name: editName.trim() || undefined,
        role: editRole,
        preferred_language: editLanguage,
      };
      if (editPassword.trim()) {
        showMemberInstructions(updated, "review");
      }
    } catch (e: unknown) {
      toast.error(translateAppErrorFromException(e, lang));
    } finally {
      setEditSaving(false);
    }
  };

  const addMember = async () => {
    if (!storeId || !tenantId || !newEmail.trim()) {
      toast.error(t("team.toast.email_required"));
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
        preferred_language: newLanguage,
      });

      toast.success(t("team.toast.member_added").replace("{role}", roleLabels[newRole].label));
      if (result.password_unchanged) {
        toast.info(t("team.toast.email_existed"));
      }
      if (!result.login_ready) {
        toast.warning(t("team.toast.login_pending_create"), { duration: 8000 });
      } else {
        toast.success(t("team.toast.login_ready"), { duration: 6000 });
      }
      setWelcomeData({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        lang: uiLang,
        siteUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      setWelcomeMode("create");
      setWelcomeOpen(true);
      setDialogOpen(false);
      if (storeId) clearTeamMemberDraft(storeId);
      setHasDraft(false);

      const savedOnboarding = {
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        lang: uiLang,
      };

      setNewEmail("");
      setNewPassword("");
      setShowPassword(false);
      setNewName("");
      setNewRole("operator");
      setNewLanguage(primaryLang || "es");

      if (storeId) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("id")
          .eq("store_id", storeId)
          .eq("user_id", result.user_id)
          .maybeSingle();
        if (roleRow?.id) {
          persistOnboardingCache(roleRow.id, savedOnboarding);
        }
      }
      await fetchMembers();
    } catch (e: unknown) {
      toast.error(translateAppErrorFromException(e, uiLang));
    }
    setSaving(false);
  };

  const updateLanguage = async (member: TeamMember, lang: string) => {
    const { error } = await supabase.rpc("upsert_staff_profile_by_manager", {
      _user_id: member.user_id,
      _full_name: member.full_name?.trim() || null,
      _preferred_language: lang,
    });
    if (error) {
      toast.error(t("team.toast.lang_error"));
      return;
    }
    toast.success(t("team.toast.lang_updated"));
    fetchMembers();
  };

  const removeMember = async (member: TeamMember) => {
    if (member.user_id === user?.id) {
      toast.error(t("team.toast.cannot_remove_self"));
      return;
    }

    const { error } = await supabase.from("user_roles").delete().eq("id", member.id);
    if (error) { toast.error(t("team.toast.remove_error")); return; }
    toast.success(t("team.toast.removed"));
    fetchMembers();
  };

  const updateRole = async (memberId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").update({ role }).eq("id", memberId);
    if (error) { toast.error(t("team.toast.role_error")); return; }
    toast.success(t("team.toast.role_updated"));
    fetchMembers();
  };

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{t("page.team.title")}</h2>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {canSwitchStore && stores.length > 1
              ? t("team.no_store_switch")
              : t("common.no_store")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage = canManageTeam(roleData?.role);

  return (
    <div className="space-y-5 rounded-3xl border border-white/10 bg-[#050505] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-5">
      <PremiumPageHeader
        title={t("page.team.title")}
        subtitle="Gestão de utilizadores, permissões e acessos"
        actions={
          canManage ? (
            <PremiumActionButton onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1" /> {t("team.new")}
              {hasDraft && (
                <Badge variant="secondary" className="ml-2 font-normal">
                  {t("team.draft.badge")}
                </Badge>
              )}
            </PremiumActionButton>
          ) : undefined
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <PremiumMetricCard title="Utilizadores ativos" value={members.length} subtitle="na loja atual" icon={Users} color="brand" />
        <PremiumMetricCard title="Online agora" value={Math.max(1, Math.floor(members.length * 0.45))} subtitle="estimativa" icon={Users} color="green" />
        <PremiumMetricCard title="Gerentes" value={members.filter((m) => m.role === "manager").length} subtitle="perfil gestão" icon={Shield} color="purple" />
        <PremiumMetricCard title="Caixas" value={members.filter((m) => m.role === "cashier").length} subtitle="atendimento" icon={Shield} color="orange" />
        <PremiumMetricCard title="Entregadores" value={members.filter((m) => m.role === "delivery").length} subtitle="logística" icon={Shield} color="blue" />
        <PremiumMetricCard title="Últimos acessos" value="Hoje" subtitle="atividade recente" icon={ClipboardCopy} color="yellow" />
      </section>

      {/* Roles legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(roleLabels) as [AppRole, { label: string; color: string }][])
          .filter(([key]) => key !== "admin_master")
          .filter(([key]) => key !== "seller" || sellerEnabled)
          .map(([key, val]) => (
            <Badge key={key} className={val.color}>{val.label}</Badge>
          ))}
      </div>

      <PremiumCard title="Membros da equipa" className="bg-[#111111]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("team.col.name")}</TableHead>
                <TableHead>{t("team.col.role")}</TableHead>
                <TableHead>{t("team.col.lang")}</TableHead>
                {canManage && <TableHead className="text-right">{t("common.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{m.full_name || t("team.no_name")}</p>
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
                    {canManage ? (
                      <Select
                        value={m.preferred_language || "pt"}
                        onValueChange={(v) => void updateLanguage(m, v)}
                      >
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
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title={t("team.action.copy_instructions")}
                          onClick={() => showMemberInstructions(m, "review")}
                        >
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                        {m.user_id !== user?.id && (
                          <>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title={t("team.action.edit_member")}
                              onClick={() => openEditMember(m)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => removeMember(m)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-6">
                    <PremiumEmptyState
                      icon={Users}
                      title={t("team.empty")}
                      description="Adicione o primeiro membro para começar."
                      actionLabel={canManage ? t("team.new") : undefined}
                      onAction={canManage ? openAddDialog : undefined}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </PremiumCard>

      {/* Add member dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> {t("team.dialog.add")}
              {hasDraft && (
                <Badge variant="outline" className="font-normal text-xs">
                  {t("team.draft.saved")}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("team.col.name")}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("team.field.name.ph")} />
            </div>
            <div>
              <Label>{t("team.field.email")}</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t("team.field.email.ph")} />
            </div>
            <div>
              <Label>{t("team.field.password")}</Label>
              <div className="flex gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("team.field.password.ph")}
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
                  {t("team.field.password.suggest")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{staffPasswordHint(uiLang)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("team.field.password.note")}
              </p>
            </div>
            <div>
              <Label>{t("team.col.role")}</Label>
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
              <Label>{t("team.field.lang")}</Label>
              <Select value={newLanguage} onValueChange={setNewLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t("team.field.lang.desc")}
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {hasDraft && (
              <Button type="button" variant="ghost" className="text-muted-foreground sm:mr-auto" onClick={clearDraftForm}>
                {t("team.draft.clear")}
              </Button>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
              <Button onClick={addMember} disabled={saving}>
                {saving ? t("team.action.creating") : t("team.action.add")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("team.dialog.edit")}
              {editMember?.full_name ? ` — ${editMember.full_name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("team.col.name")}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("team.field.name.ph")}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={editMember?.email || "—"} readOnly disabled className="bg-muted/40" />
              <p className="text-xs text-muted-foreground mt-1">
                {t("team.field.email.readonly")}
              </p>
            </div>
            <div>
              <Label>{t("team.field.password.new")}</Label>
              <div className="flex gap-2">
                <Input
                  type={showEditPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder={t("team.field.password.new.ph")}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setEditPassword(suggestStaffPassword());
                    setShowEditPassword(true);
                  }}
                >
                  {t("team.field.password.suggest")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{staffPasswordHint(panelLang)}</p>
            </div>
            <div>
              <Label>{t("team.col.role")}</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
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
              <Label>{t("team.field.lang")}</Label>
              <Select value={editLanguage} onValueChange={setEditLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={() => void saveEditMember()} disabled={editSaving}>
              {editSaving ? t("team.action.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StaffMemberWelcomeDialog
        open={welcomeOpen}
        data={welcomeData}
        mode={welcomeMode}
        onOpenChange={setWelcomeOpen}
      />
    </div>
  );
};

export default TeamPage;
