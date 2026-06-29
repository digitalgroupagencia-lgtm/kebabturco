import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecretInput } from "@/components/ui/secret-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Plus, Trash2, Shield, Pencil, ClipboardCopy, UserPlus, KeyRound } from "lucide-react";
import { RESTAURANT_STAFF_ROLES, canManageTeam, getStaffRoleLabel, type StaffRole } from "@/lib/staffPermissions";
import { translateAppErrorFromException, translateAppError } from "@/lib/authErrorMessages";
import { staffPasswordHint, suggestStaffPassword, validateStaffPassword } from "@/lib/staffPassword";
import {
  staffAccessPinHint,
  suggestStaffAccessPin,
  sanitizeStaffAccessPinInput,
  validateStaffAccessPin,
} from "@/lib/staffAccessPin";
import { useStoreLanguages } from "@/hooks/useStoreLanguages";
import { useStaffT } from "@/hooks/useStaffT";
import { useStaffGooglePendingFeed } from "@/hooks/useStaffGooglePendingFeed";
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
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { fetchStoreTeamMembers, saveTeamMemberByManager } from "@/services/teamMemberService";
import {
  approveStaffGooglePending,
  rejectStaffGooglePending,
  type StaffGooglePendingMember,
} from "@/services/staffGoogleLogin";

type AppRole = StaffRole;

interface TeamMember {
  id: string;
  user_id: string;
  role: AppRole;
  email?: string;
  full_name?: string;
  preferred_language?: string;
  avatar_url?: string | null;
  birth_date?: string | null;
}

const ROLE_COLORS: Record<AppRole, string> = {
  admin_master: "bg-destructive",
  restaurant_admin: "bg-primary",
  manager: "bg-primary",
  operator: "bg-accent text-accent-foreground",
  kitchen: "bg-success",
  cashier: "bg-yellow-600 text-white",
  attendant: "bg-blue-600 text-white",
  delivery: "bg-orange-600 text-white",
  seller: "bg-cta text-cta-foreground",
};

const LANG_CODES = ["pt", "es", "en", "fr"] as const;

const TeamPage = () => {
  const { user } = useAuth();
  const { t, lang: staffLang } = useStaffT();

  const langLabel = (code: string) => {
    const key = `lang.${code}` as "lang.pt" | "lang.es" | "lang.en" | "lang.fr";
    return t(key);
  };
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
  const [editBirthDate, setEditBirthDate] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditAccessPin, setShowEditAccessPin] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editAccessPin, setEditAccessPin] = useState("");
  const [editHasAccessPin, setEditHasAccessPin] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const draftToastStoreRef = useRef<string | null>(null);
  const [googleApproveOpen, setGoogleApproveOpen] = useState(false);
  const [googleApproveTarget, setGoogleApproveTarget] = useState<StaffGooglePendingMember | null>(null);
  const [googleApproveName, setGoogleApproveName] = useState("");
  const [googleApproveRole, setGoogleApproveRole] = useState<AppRole>("operator");
  const [googleApproveLang, setGoogleApproveLang] = useState("es");
  const [googleApproveSaving, setGoogleApproveSaving] = useState(false);
  const canManage = canManageTeam(roleData?.role);
  const {
    rows: googlePending,
    loading: googlePendingLoading,
    refresh: refreshGooglePending,
  } = useStaffGooglePendingFeed({
    storeId,
    enabled: Boolean(storeId && canManage),
  });

  useEffect(() => {
    if (storeId) {
      void fetchMembers();
    } else {
      setLoading(false);
    }
  }, [storeId, roleData?.role]);

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

    try {
      const rows = await fetchStoreTeamMembers(storeId);
      setMembers(
        rows.map((row) => ({
          id: row.user_role_id,
          user_id: row.user_id,
          role: row.role,
          email: row.email || undefined,
          full_name: row.full_name || undefined,
          preferred_language: row.preferred_language || "pt",
          avatar_url: row.avatar_url ?? null,
          birth_date: row.birth_date ?? null,
        })),
      );
    } catch (e: unknown) {
      toast.error(translateAppErrorFromException(e, panelLang));
    }

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
      paymentCode?: string | null;
      loginMethod?: "email" | "google";
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

  const openEditMember = async (member: TeamMember) => {
    const cache = storeId ? loadTeamOnboardingCache(storeId, member.id) : null;
    setEditMember(member);
    setEditName(member.full_name || cache?.name || "");
    setEditPassword("");
    setEditAccessPin("");
    setEditRole(member.role);
    setEditLanguage(member.preferred_language || primaryLang || "es");
    setEditBirthDate(member.birth_date || "");
    setShowEditPassword(false);
    setShowEditAccessPin(false);
    if (storeId) {
      const { data: pinRow } = await supabase
        .from("staff_access_pins")
        .select("id, is_active")
        .eq("user_role_id", member.id)
        .maybeSingle();
      setEditHasAccessPin(Boolean(pinRow?.is_active));
    } else {
      setEditHasAccessPin(false);
    }
  };

  const saveEditMember = async () => {
    if (!editMember || !storeId) return;
    const lang = (editLanguage === "es" ? "es" : "pt") as "pt" | "es";
    if (!editName.trim()) {
      toast.error(t("team.toast.name_required"));
      return;
    }
    if (editPassword.trim()) {
      const passwordError = validateStaffPassword(editPassword, lang);
      if (passwordError) {
        toast.error(passwordError);
        return;
      }
    }
    if (editAccessPin.trim()) {
      const pinError = validateStaffAccessPin(editAccessPin, lang);
      if (pinError) {
        toast.error(pinError);
        return;
      }
    }

    setEditSaving(true);
    try {
      const saved = await saveTeamMemberByManager({
        storeId,
        userRoleId: editMember.id,
        userId: editMember.user_id,
        fullName: editName.trim(),
        preferredLanguage: editLanguage,
        birthDate: editBirthDate || null,
        role: editRole,
        accessPin: editAccessPin.trim() || null,
      });

      if (editPassword.trim()) {
        await updateStaffMember({
          user_id: editMember.user_id,
          user_role_id: editMember.id,
          store_id: storeId,
          email: editMember.email,
          full_name: saved.full_name ?? editName.trim(),
          role: editRole,
          preferred_language: editLanguage,
          birth_date: editBirthDate || null,
          password: editPassword.trim(),
        });
      }

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
        paymentCode: editAccessPin.trim() || cache?.paymentCode || null,
        loginMethod: cache?.loginMethod ?? "email",
      });

      toast.success(t("team.toast.member_updated"));
      if (editPassword.trim() && !loginReady) {
        toast.warning(t("team.toast.login_pending_edit"), { duration: 8000 });
      }

      const savedMember: TeamMember = {
        ...editMember,
        full_name: saved.full_name?.trim() || editName.trim(),
        role: editRole,
        preferred_language: saved.preferred_language || editLanguage,
        birth_date: saved.birth_date ?? (editBirthDate || null),
        avatar_url: saved.avatar_url ?? editMember.avatar_url ?? null,
      };
      setMembers((prev) => prev.map((m) => (m.id === editMember.id ? savedMember : m)));
      if (editAccessPin.trim()) {
        setEditHasAccessPin(true);
      }

      setEditMember(null);
      await fetchMembers();

      const updated: TeamMember = {
        ...editMember,
        full_name: editName.trim() || undefined,
        role: editRole,
        preferred_language: editLanguage,
      };
      if (editPassword.trim() || editAccessPin.trim()) {
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

      toast.success(t("team.toast.member_added").replace("{role}", getStaffRoleLabel(newRole, staffLang)));
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
        loginMethod: "email",
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
        loginMethod: "email" as const,
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
    const { error } = await (supabase.rpc as any)("upsert_staff_profile_by_manager", {
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

  const openGoogleApprove = (row: StaffGooglePendingMember) => {
    setGoogleApproveTarget(row);
    setGoogleApproveName(row.full_name || "");
    setGoogleApproveRole("delivery");
    setGoogleApproveLang(primaryLang || "es");
    setGoogleApproveOpen(true);
  };

  const confirmApproveGoogle = async () => {
    if (!googleApproveTarget) return;
    setGoogleApproveSaving(true);
    try {
      await approveStaffGooglePending({
        pendingId: googleApproveTarget.id,
        role: googleApproveRole,
        fullName: googleApproveName,
        preferredLanguage: googleApproveLang,
      });
      toast.success(t("team.google.toast.approved"));
      setGoogleApproveOpen(false);

      const approvedEmail = googleApproveTarget.email;
      const approvedLang = (googleApproveLang === "es" ? "es" : "pt") as "pt" | "es";
      const approvedName = googleApproveName.trim() || googleApproveTarget.full_name || approvedEmail;

      await fetchMembers();

      if (storeId) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("id, user_id")
          .eq("store_id", storeId)
          .eq("user_id", googleApproveTarget.user_id)
          .maybeSingle();

        if (roleRow?.id) {
          persistOnboardingCache(roleRow.id, {
            name: approvedName,
            email: approvedEmail,
            password: "",
            role: googleApproveRole,
            lang: approvedLang,
            loginMethod: "google",
          });
        }
      }

      setWelcomeData({
        name: approvedName,
        email: approvedEmail,
        password: "",
        role: googleApproveRole,
        lang: approvedLang,
        siteUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        loginMethod: "google",
      });
      setWelcomeMode("create");
      setWelcomeOpen(true);
      setGoogleApproveTarget(null);
    } catch (e: unknown) {
      toast.error(translateAppErrorFromException(e, uiLang));
    } finally {
      setGoogleApproveSaving(false);
      await refreshGooglePending();
    }
  };

  const rejectGooglePending = async (row: StaffGooglePendingMember) => {
    if (!window.confirm(t("team.google.toast.reject_confirm"))) return;
    try {
      await rejectStaffGooglePending(row.id);
      toast.success(t("team.google.toast.rejected"));
      await refreshGooglePending();
    } catch (e: unknown) {
      toast.error(translateAppErrorFromException(e, uiLang));
    }
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
    const { error } = await supabase.from("user_roles").update({ role: role as any }).eq("id", memberId);
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

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        icon={Users}
        title={t("page.team.title")}
        subtitle={t("team.subtitle")}
        actions={
          canManage ? (
            <Button size="sm" onClick={openAddDialog} className="h-9">
              <Plus className="h-4 w-4 mr-1" /> {t("team.new")}
              {hasDraft && (
                <Badge variant="secondary" className="ml-2 font-normal">
                  {t("team.draft.badge")}
                </Badge>
              )}
            </Button>
          ) : null
        }
      />

      {canManage && (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {t("team.google.pending.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("team.google.pending.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {googlePendingLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : googlePending.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("team.google.pending.empty")}</p>
            ) : (
              googlePending.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">{row.full_name || t("team.no_name")}</p>
                    <p className="text-sm text-muted-foreground">{row.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("team.google.pending.since")}: {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openGoogleApprove(row)}>
                      {t("team.google.pending.approve")}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => void rejectGooglePending(row)}>
                      {t("team.google.pending.reject")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Roles legend */}
      <div className="flex flex-wrap gap-2">
        {(RESTAURANT_STAFF_ROLES as AppRole[])
          .filter((key) => key !== "admin_master")
          .filter((key) => key !== "seller" || sellerEnabled)
          .map((key) => (
            <Badge key={key} className={ROLE_COLORS[key]}>{getStaffRoleLabel(key, staffLang)}</Badge>
          ))}
      </div>

      <Card>
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
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                            {(m.full_name || m.email || "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{m.full_name || t("team.no_name")}</p>
                        <p className="text-xs text-muted-foreground">{m.email || m.user_id.slice(0, 8) + "..."}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManage && m.user_id !== user?.id ? (
                      <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as AppRole)}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESTAURANT_STAFF_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {getStaffRoleLabel(r, staffLang)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={ROLE_COLORS[m.role]}>{getStaffRoleLabel(m.role, staffLang)}</Badge>
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
                          {LANG_CODES.map((code) => <SelectItem key={code} value={code}>{langLabel(code)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">{langLabel(m.preferred_language || "pt")}</span>
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
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {t("team.empty")}
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
                <SecretInput
                  visible={showPassword}
                  onVisibleChange={setShowPassword}
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
                      {getStaffRoleLabel(r, staffLang)}
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
                  {LANG_CODES.map((code) => <SelectItem key={code} value={code}>{langLabel(code)}</SelectItem>)}
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
              {editMember?.full_name ? `, ${editMember.full_name}` : ""}
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
              <Label>{t("profile.field.birth")}</Label>
              <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={editMember?.email || ", "} readOnly disabled className="bg-muted/40" />
              <p className="text-xs text-muted-foreground mt-1">
                {t("team.field.email.readonly")}
              </p>
            </div>
            {!editPassword.trim() && (
              <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2">
                {t("team.field.password.google_hint")}
              </p>
            )}
            <div>
              <Label>{t("team.field.password.new")}</Label>
              <div className="flex gap-2">
                <SecretInput
                  visible={showEditPassword}
                  onVisibleChange={setShowEditPassword}
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
              <Label className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                {t("team.field.accessPin")}
                {editHasAccessPin ? (
                  <Badge variant="secondary" className="h-5 text-[10px] font-normal">
                    {t("team.field.accessPin.active")}
                  </Badge>
                ) : null}
              </Label>
              <div className="flex gap-2">
                <SecretInput
                  visible={showEditAccessPin}
                  onVisibleChange={setShowEditAccessPin}
                  inputMode="numeric"
                  value={editAccessPin}
                  onChange={(e) => setEditAccessPin(sanitizeStaffAccessPinInput(e.target.value))}
                  placeholder={t("team.field.accessPin.ph")}
                  className="flex-1 font-mono tracking-widest"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setEditAccessPin(suggestStaffAccessPin(true));
                    setShowEditAccessPin(true);
                  }}
                >
                  {t("team.field.accessPin.suggest")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("team.field.accessPin.hint")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{staffAccessPinHint(panelLang)}</p>
            </div>
            <div>
              <Label>{t("team.col.role")}</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESTAURANT_STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {getStaffRoleLabel(r, staffLang)}
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
                  {LANG_CODES.map((code) => <SelectItem key={code} value={code}>{langLabel(code)}</SelectItem>)}
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

      <Dialog open={googleApproveOpen} onOpenChange={setGoogleApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("team.google.dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("team.field.email")}</Label>
              <Input value={googleApproveTarget?.email || ""} readOnly disabled className="bg-muted/40" />
            </div>
            <div>
              <Label>{t("team.col.name")}</Label>
              <Input
                value={googleApproveName}
                onChange={(e) => setGoogleApproveName(e.target.value)}
                placeholder={t("team.field.name.ph")}
              />
            </div>
            <div>
              <Label>{t("team.col.role")}</Label>
              <Select value={googleApproveRole} onValueChange={(v) => setGoogleApproveRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESTAURANT_STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {getStaffRoleLabel(r, staffLang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("team.field.lang")}</Label>
              <Select value={googleApproveLang} onValueChange={setGoogleApproveLang}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANG_CODES.map((code) => <SelectItem key={code} value={code}>{langLabel(code)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={() => void confirmApproveGoogle()} disabled={googleApproveSaving}>
              {googleApproveSaving ? t("team.action.saving") : t("team.google.pending.approve")}
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
