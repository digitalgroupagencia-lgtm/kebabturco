import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import StaffPinKeypad from "@/components/tapToPay/StaffPinKeypad";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { usePanelStore } from "@/contexts/PanelStoreContext";
import { useStaffT } from "@/hooks/useStaffT";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { translateAppErrorFromException } from "@/lib/authErrorMessages";
import {
  staffAccessPinHint,
  suggestStaffAccessPin,
  validateStaffAccessPin,
} from "@/lib/staffAccessPin";
import {
  fetchMyStaffProfile,
  saveMyStaffProfile,
  uploadStaffAvatar,
} from "@/services/staffProfile";
import {
  hasMyStaffAccessPin,
  markPanelOnboardingCached,
  saveMyStaffAccessPin,
} from "@/services/sellerSetupService";

export default function MyProfilePage() {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const isAdminMaster = roleData?.role === "admin_master";
  const { storeId } = usePanelStore();
  const { t, lang } = useStaffT();
  const uiLang = lang === "en" ? "es" : lang;
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    setEmail(user.email ?? "");
    void (async () => {
      setLoading(true);
      try {
        const [profile, pinReady] = await Promise.all([
          fetchMyStaffProfile(user.id),
          hasMyStaffAccessPin(user.id),
        ]);
        setFullName(profile?.full_name?.trim() || "");
        setBirthDate(profile?.birth_date || "");
        setAvatarUrl(profile?.avatar_url || null);
        setHasPin(pinReady);
      } catch (e) {
        toast.error(translateAppErrorFromException(e, uiLang));
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, uiLang]);

  const handlePhoto = async (file: File | null) => {
    if (!file || !user?.id || !storeId) return;
    setUploading(true);
    try {
      const url = await uploadStaffAvatar(storeId, user.id, file);
      setAvatarUrl(url);
      toast.success(t("profile.photo.updated"));
      window.dispatchEvent(new Event("kebab-staff-setup-changed"));
    } catch (e) {
      toast.error(translateAppErrorFromException(e, uiLang));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error(t("profile.name.required"));
      return;
    }
    setSaving(true);
    try {
      await saveMyStaffProfile({
        full_name: fullName.trim(),
        birth_date: birthDate || null,
        avatar_url: avatarUrl,
      });
      toast.success(t("profile.saved"));
      window.dispatchEvent(new Event("kebab-staff-setup-changed"));
    } catch (e) {
      toast.error(translateAppErrorFromException(e, uiLang));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePin = async () => {
    const pinError = validateStaffAccessPin(pin, uiLang);
    if (pinError) {
      toast.error(pinError);
      return;
    }
    if (pin !== pinConfirm) {
      toast.error(t("staff.setup.pin_mismatch"));
      return;
    }
    setSavingPin(true);
    try {
      await saveMyStaffAccessPin(pin.trim());
      setHasPin(true);
      setPin("");
      setPinConfirm("");
      if (user?.id) markPanelOnboardingCached(user.id);
      toast.success(t("profile.pin.saved"));
      window.dispatchEvent(new Event("kebab-staff-setup-changed"));
    } catch (e) {
      toast.error(translateAppErrorFromException(e, uiLang));
    } finally {
      setSavingPin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <PremiumPageHeader
        icon={User}
        title={t("profile.title")}
        subtitle={t("profile.subtitle")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.card.title")}</CardTitle>
          <CardDescription>{t("profile.card.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-border bg-muted"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !storeId}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <User className="h-12 w-12" />
                </div>
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[10px] font-semibold text-white">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                {t("profile.photo.change")}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => void handlePhoto(e.target.files?.[0] ?? null)}
            />
            <p className="text-center text-xs text-muted-foreground">{t("profile.photo.hint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-name">{t("profile.field.name")}</Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("profile.field.name.ph")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-birth">{t("profile.field.birth")}</Label>
            <Input
              id="profile-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("profile.field.birth.hint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{t("profile.field.email")}</Label>
            <Input value={email} readOnly disabled className="bg-muted/40" />
            <p className="text-xs text-muted-foreground">{t("profile.field.email.hint")}</p>
          </div>

          <Button className="w-full" onClick={() => void handleSave()} disabled={saving || uploading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("profile.saving")}
              </>
            ) : (
              t("profile.save")
            )}
          </Button>
        </CardContent>
      </Card>

      {!isAdminMaster ? (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t("profile.pin.card.title")}</CardTitle>
            {hasPin ? (
              <Badge variant="secondary" className="h-5 text-[10px] font-normal">
                {t("team.field.accessPin.active")}
              </Badge>
            ) : null}
          </div>
          <CardDescription>{t("profile.pin.card.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">{t("staff.setup.pin_body")}</p>
          <p className="text-[11px] text-muted-foreground">{staffAccessPinHint(uiLang)}</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t("staff.setup.pin_label")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPin(suggestStaffAccessPin(true))}
              >
                {t("team.field.accessPin.suggest")}
              </Button>
            </div>
            <StaffPinKeypad value={pin} onChange={setPin} />
          </div>

          <div className="space-y-2">
            <Label>{t("staff.setup.pin_confirm")}</Label>
            <StaffPinKeypad value={pinConfirm} onChange={setPinConfirm} />
          </div>

          <Button className="w-full" onClick={() => void handleSavePin()} disabled={savingPin || !pin || !pinConfirm}>
            {savingPin ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("profile.pin.saving")}
              </>
            ) : (
              t("profile.pin.save")
            )}
          </Button>
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}
