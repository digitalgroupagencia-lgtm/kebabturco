import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStaffT } from "@/hooks/useStaffT";
import { translateAppErrorFromException } from "@/lib/authErrorMessages";
import { staffAccessPinHint, validateStaffAccessPin } from "@/lib/staffAccessPin";
import {
  fetchSellerSetupStatus,
  isPanelOnboardingCached,
  markPanelOnboardingCached,
  saveMyStaffAccessPin,
  saveSellerOnboarding,
  verifyMyStaffAccessPin,
  type SellerSetupStatus,
} from "@/services/sellerSetupService";
import { fetchMyStaffProfile } from "@/services/staffProfile";
import { usePanelStore } from "@/contexts/PanelStoreContext";
import { toast } from "sonner";

type Props = {
  userId: string;
  children: ReactNode;
};

/** Primeiro acesso ao painel: perfil + confirmação do código de balcão. */
export default function StaffPanelOnboardingGate({ userId, children }: Props) {
  const { t, lang } = useStaffT();
  const uiLang = lang === "en" ? "es" : lang;
  const { storeId } = usePanelStore();
  const [checking, setChecking] = useState(() => !isPanelOnboardingCached(userId));
  const [setup, setSetup] = useState<SellerSetupStatus | null>(() =>
    isPanelOnboardingCached(userId)
      ? { profileComplete: true, hasPin: true, ready: true }
      : null,
  );
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  if (isPanelOnboardingCached(userId)) {
    return <>{children}</>;
  }

  const ready = setup?.ready ?? false;
  const showProfile = !setup?.profileComplete;
  const pinOnly = Boolean(setup?.hasPin && setup?.profileComplete);

  useEffect(() => {
    if (isPanelOnboardingCached(userId)) {
      setChecking(false);
      return;
    }
    let mounted = true;
    void (async () => {
      setChecking(true);
      try {
        const [status, profile] = await Promise.all([
          fetchSellerSetupStatus(userId),
          fetchMyStaffProfile(userId),
        ]);
        if (!mounted) return;
        setSetup(status);
        setFullName(profile?.full_name?.trim() || "");
        setBirthDate(profile?.birth_date || "");
        if (status.ready) markPanelOnboardingCached(userId);
      } catch {
        if (mounted) setSetup({ profileComplete: false, hasPin: false, ready: false });
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const handleSave = async () => {
    if (!storeId) {
      toast.error(t("common.no_store"));
      return;
    }

    const pinError = validateStaffAccessPin(pin, uiLang);
    if (pinError) {
      toast.error(pinError);
      return;
    }
    if (pin !== pinConfirm) {
      toast.error(t("staff.setup.pin_mismatch"));
      return;
    }

    if (showProfile && !fullName.trim()) {
      toast.error(t("profile.name.required"));
      return;
    }

    setSaving(true);
    try {
      if (setup?.hasPin) {
        const ok = await verifyMyStaffAccessPin(storeId, pin.trim(), userId);
        if (!ok) {
          toast.error(t("staff.setup.pin_invalid"));
          return;
        }
        if (showProfile) {
          await saveSellerOnboarding({
            fullName: fullName.trim(),
            birthDate: birthDate || null,
            pin: pin.trim(),
          });
        }
      } else {
        await saveSellerOnboarding({
          fullName: fullName.trim(),
          birthDate: birthDate || null,
          pin: pin.trim(),
        });
      }

      toast.success(t("staff.setup.done"));
      markPanelOnboardingCached(userId);
      setSetup({ profileComplete: true, hasPin: true, ready: true });
    } catch (e) {
      toast.error(translateAppErrorFromException(e, uiLang));
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (ready) return <>{children}</>;

  return (
    <div className="mx-auto max-w-md w-full space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {pinOnly ? <KeyRound className="h-7 w-7" /> : <User className="h-7 w-7" />}
        </div>
        <h1 className="text-2xl font-black">{t("staff.setup.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {pinOnly ? t("staff.setup.pin_only_subtitle") : t("staff.setup.subtitle")}
        </p>
      </div>

      {showProfile ? (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="panel-staff-name">{t("profile.field.name")}</Label>
            <Input
              id="panel-staff-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("profile.field.name.ph")}
              className="h-11"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="panel-staff-birth">{t("profile.field.birth")}</Label>
            <Input
              id="panel-staff-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <p className="font-bold">{t("staff.setup.pin_title")}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t("staff.setup.pin_body")}</p>
        <p className="text-[11px] text-muted-foreground">{staffAccessPinHint(uiLang)}</p>
        <div className="space-y-2">
          <Label htmlFor="panel-staff-pin">{t("staff.setup.pin_label")}</Label>
          <Input
            id="panel-staff-pin"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="h-11 text-center text-lg tracking-widest font-mono"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="panel-staff-pin2">{t("staff.setup.pin_confirm")}</Label>
          <Input
            id="panel-staff-pin2"
            inputMode="numeric"
            value={pinConfirm}
            onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="h-11 text-center text-lg tracking-widest font-mono"
            autoComplete="new-password"
          />
        </div>
      </div>

      <Button className="w-full h-12 font-black text-base" disabled={saving} onClick={() => void handleSave()}>
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : t("staff.setup.save")}
      </Button>
    </div>
  );
}
