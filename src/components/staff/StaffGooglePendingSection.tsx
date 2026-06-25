import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStaffT } from "@/hooks/useStaffT";
import { useStaffGooglePendingFeed } from "@/hooks/useStaffGooglePendingFeed";
import { translateAppErrorFromException } from "@/lib/authErrorMessages";
import {
  RESTAURANT_STAFF_ROLES,
  STAFF_ROLE_LABELS,
  type StaffRole,
} from "@/lib/staffPermissions";
import {
  approveStaffGooglePending,
  rejectStaffGooglePending,
  type StaffGooglePendingMember,
} from "@/services/staffGoogleLogin";

const LANGUAGES = [
  { value: "pt", label: "🇧🇷 Português" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "en", label: "🇬🇧 English" },
  { value: "fr", label: "🇫🇷 Français" },
];

type Props = {
  storeId: string | null;
  defaultLang?: string;
  onChanged?: () => void;
};

/** Pedidos de acesso com Google, aprovar ou recusar antes de abrir o painel. */
export default function StaffGooglePendingSection({ storeId, defaultLang = "es", onChanged }: Props) {
  const { t, lang: staffLang } = useStaffT();
  const uiLang = staffLang === "en" ? "es" : staffLang;
  const { rows, loading, error, refresh } = useStaffGooglePendingFeed({ storeId, enabled: Boolean(storeId) });
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<StaffGooglePendingMember | null>(null);
  const [approveName, setApproveName] = useState("");
  const [approveRole, setApproveRole] = useState<StaffRole>("operator");
  const [approveLang, setApproveLang] = useState(defaultLang);
  const [approveSaving, setApproveSaving] = useState(false);

  useEffect(() => {
    if (error) toast.error(translateAppErrorFromException(new Error(error), uiLang));
  }, [error, uiLang]);

  useEffect(() => {
    setApproveLang(defaultLang);
  }, [defaultLang]);

  const openApprove = (row: StaffGooglePendingMember) => {
    setApproveTarget(row);
    setApproveName(row.full_name || "");
    setApproveRole("operator");
    setApproveLang(defaultLang);
    setApproveOpen(true);
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setApproveSaving(true);
    try {
      await approveStaffGooglePending({
        pendingId: approveTarget.id,
        role: approveRole,
        fullName: approveName,
        preferredLanguage: approveLang,
      });
      toast.success(t("team.google.toast.approved"));
      setApproveOpen(false);
      setApproveTarget(null);
      await refresh();
      onChanged?.();
    } catch (e) {
      toast.error(translateAppErrorFromException(e, uiLang));
    } finally {
      setApproveSaving(false);
    }
  };

  const rejectPending = async (row: StaffGooglePendingMember) => {
    if (!window.confirm(t("team.google.toast.reject_confirm"))) return;
    try {
      await rejectStaffGooglePending(row.id);
      toast.success(t("team.google.toast.rejected"));
      await refresh();
      onChanged?.();
    } catch (e) {
      toast.error(translateAppErrorFromException(e, uiLang));
    }
  };

  if (!storeId) return null;

  return (
    <>
      <Card className="border-primary/25 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t("team.google.pending.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("team.google.pending.subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("team.google.pending.empty")}</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-foreground">{row.full_name || row.email}</p>
                  <p className="text-sm text-muted-foreground">{row.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("team.google.pending.since")}: {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openApprove(row)}>
                    {t("team.google.pending.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => void rejectPending(row)}
                  >
                    {t("team.google.pending.reject")}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("team.google.dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("team.field.email")}</Label>
              <Input value={approveTarget?.email || ""} readOnly disabled className="bg-muted/40" />
            </div>
            <div>
              <Label>{t("team.col.name")}</Label>
              <Input
                value={approveName}
                onChange={(e) => setApproveName(e.target.value)}
                placeholder={t("team.field.name.ph")}
              />
            </div>
            <div>
              <Label>{t("team.col.role")}</Label>
              <Select value={approveRole} onValueChange={(v) => setApproveRole(v as StaffRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESTAURANT_STAFF_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {STAFF_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("team.field.lang")}</Label>
              <Select value={approveLang} onValueChange={setApproveLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <Button onClick={() => void confirmApprove()} disabled={approveSaving}>
              {approveSaving ? t("team.action.saving") : t("team.google.pending.approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
