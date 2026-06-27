import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStaffT } from "@/hooks/useStaffT";
import { translateAppErrorFromException } from "@/lib/authErrorMessages";
import { staffAccessPinHint, validateStaffAccessPin } from "@/lib/staffAccessPin";
import { fetchSellerSetupStatus, saveSellerOnboarding } from "@/services/sellerSetupService";
import { toast } from "sonner";

type Props = {
  userId: string;
  children: ReactNode;
};

export default function SellerOnboardingGate({ userId, children }: Props) {
  const { t, lang } = useStaffT();
  const uiLang = lang === "en" ? "es" : lang;
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setChecking(true);
      try {
        const status = await fetchSellerSetupStatus(userId);
        if (!mounted) return;
        setReady(status.ready);
      } catch {
        if (mounted) setReady(false);
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error(t("profile.name.required"));
      return;
    }
    const pinError = validateStaffAccessPin(pin, uiLang);
    if (pinError) {
      toast.error(pinError);
      return;
    }
    if (pin !== pinConfirm) {
      toast.error(t("seller.setup.pin_mismatch"));
      return;
    }

    setSaving(true);
    try {
      await saveSellerOnboarding({
        fullName: fullName.trim(),
        birthDate: birthDate || null,
        pin: pin.trim(),
      });
      toast.success(t("seller.setup.done"));
      setReady(true);
    } catch (e) {
      toast.error(translateAppErrorFromException(e, uiLang));
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (ready) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto px-4 py-8 max-w-md mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black">{t("seller.setup.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("seller.setup.subtitle")}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seller-name">{t("profile.field.name")}</Label>
            <Input
              id="seller-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("profile.field.name.ph")}
              className="h-11"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seller-birth">{t("profile.field.birth")}</Label>
            <Input
              id="seller-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <p className="font-bold">{t("seller.setup.pin_title")}</p>
          </div>
          <p className="text-xs text-muted-foreground">{t("seller.setup.pin_body")}</p>
          <p className="text-[11px] text-muted-foreground">{staffAccessPinHint(uiLang)}</p>
          <div className="space-y-2">
            <Label htmlFor="seller-pin">{t("seller.setup.pin_label")}</Label>
            <Input
              id="seller-pin"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="h-11 text-center text-lg tracking-widest font-mono"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seller-pin2">{t("seller.setup.pin_confirm")}</Label>
            <Input
              id="seller-pin2"
              inputMode="numeric"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="h-11 text-center text-lg tracking-widest font-mono"
              autoComplete="new-password"
            />
          </div>
        </div>

        <Button className="w-full h-12 font-black text-base" disabled={saving} onClick={() => void handleSave()}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : t("seller.setup.save")}
        </Button>
      </div>
    </div>
  );
}
