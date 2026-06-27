import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { usePanelStore } from "@/contexts/PanelStoreContext";
import { useStaffT } from "@/hooks/useStaffT";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { translateAppErrorFromException } from "@/lib/authErrorMessages";
import { staffAccessPinHint, validateStaffAccessPin } from "@/lib/staffAccessPin";
import {
  fetchMyStaffProfile,
  saveMyStaffProfile,
  uploadStaffAvatar,
} from "@/services/staffProfile";
import { fetchSellerSetupStatus, saveMyStaffAccessPin } from "@/services/sellerSetupService";

export default function MyProfilePage() {
  const { user } = useAuth();
  const { storeId } = usePanelStore();
  const { t, lang } = useStaffT();
  const uiLang = lang === "en" ? "es" : lang;
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [hasPin, setHasPin] = useState(true);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    setEmail(user.email ?? "");
    void (async () => {
      setLoading(true);
      try {
        const [profile, setup] = await Promise.all([
          fetchMyStaffProfile(user.id),
          fetchSellerSetupStatus(user.id),
        ]);
        setFullName(profile?.full_name?.trim() || "");
        setBirthDate(profile?.birth_date || "");
        setAvatarUrl(profile?.avatar_url || null);
        setHasPin(setup.hasPin);
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

    if (!hasPin) {
      const pinError = validateStaffAccessPin(pin, uiLang);
      if (pinError) {
        toast.error(pinError);
        return;
      }
      if (pin !== pinConfirm) {
        toast.error(t("seller.setup.pin_mismatch"));
        return;
      }
    }

    setSaving(true);
    try {
      await saveMyStaffProfile({
        full_name: fullName.trim(),
        birth_date: birthDate || null,
        avatar_url: avatarUrl,
      });
      if (!hasPin) {
        await saveMyStaffAccessPin(pin.trim());
        setHasPin(true);
        setPin("");
        setPinConfirm("");
      }
      toast.success(t("profile.saved"));
    } catch (e) {
      toast.error(translateAppErrorFromException(e, uiLang));
    } finally {
      setSaving(false);
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
    <div className="mx-auto max-w-lg space-y-6">
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

          {!hasPin ? (
            <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <p className="font-bold">{t("profile.pin.title")}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t("profile.pin.body")}</p>
              <p className="text-[11px] text-muted-foreground">{staffAccessPinHint(uiLang)}</p>
              <div className="space-y-1.5">
                <Label htmlFor="profile-pin">{t("seller.setup.pin_label")}</Label>
                <Input
                  id="profile-pin"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="text-center text-lg tracking-widest font-mono"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-pin2">{t("seller.setup.pin_confirm")}</Label>
                <Input
                  id="profile-pin2"
                  inputMode="numeric"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="text-center text-lg tracking-widest font-mono"
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs font-medium text-primary">{t("profile.pin.required")}</p>
            </div>
          ) : null}

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
    </div>
  );
}
