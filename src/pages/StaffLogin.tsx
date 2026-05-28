import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Shield, Delete, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffUiLang } from "@/hooks/useStaffUiLang";
import { useStaffLoginStore } from "@/hooks/useStaffLoginStore";
import {
  loginWithStaffPin,
  markStaffSession,
  resolveStaffLoginDestination,
} from "@/lib/staffLogin";
import { StaffPinLoginHintError } from "@/services/staffPinLogin";
import { STAFF_PIN_PATTERN } from "@/lib/staffAccessPin";
import { getStaffLoginCopy, mapStaffPinError } from "@/lib/staffUiCopy";
import StaffLanguageToggle from "@/components/StaffLanguageToggle";
import { canAccessPanel, canAccessDeliveryPanel, type StaffRole } from "@/lib/staffPermissions";

const StaffLogin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const { storeId: loginStoreId, refresh: refreshStore } = useStaffLoginStore();
  const lang = useStaffUiLang("es");
  const copy = getStaffLoginCopy(lang);
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pinReady = STAFF_PIN_PATTERN.test(pin);

  useEffect(() => {
    if (authLoading || roleLoading || !user || !roleData?.role) return;
    const role = roleData.role as StaffRole;
    if (canAccessDeliveryPanel(role) && role === "delivery") {
      navigate(resolveStaffLoginDestination(role), { replace: true });
      return;
    }
    if (canAccessPanel(role) || role === "admin_master" || role === "seller") {
      navigate(resolveStaffLoginDestination(role), { replace: true });
    }
  }, [authLoading, roleLoading, user, roleData?.role, navigate]);

  const appendChar = (char: string) => {
    if (pin.length >= 10) return;
    setPin((prev) => prev + char);
    setError(null);
  };

  const backspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!pinReady) {
      setError(copy.pinInvalid);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const storeId = loginStoreId ?? (await refreshStore());
      const { role } = await loginWithStaffPin(storeId, pin);
      navigate(resolveStaffLoginDestination(role), { replace: true });
    } catch (e) {
      if (e instanceof StaffPinLoginHintError) {
        if (e.email) setEmail(e.email);
        setError(copy.serverUnavailable);
        return;
      }
      const raw = e instanceof Error ? e.message : copy.pinWrong;
      setError(mapStaffPinError(raw, lang));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      setError(copy.emailFailed);
      return;
    }

    setEmailSubmitting(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;
      markStaffSession();
    } catch {
      setError(copy.emailFailed);
    } finally {
      setEmailSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{copy.storeLoading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="shrink-0 border-b bg-card/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={copy.backAria}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Shield className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">{copy.title}</h1>
              <p className="text-xs text-muted-foreground">{copy.subtitle}</p>
            </div>
          </div>
          <StaffLanguageToggle compact defaultLang="es" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-6 py-6 pb-8">
        <p className="mb-5 text-center text-sm text-muted-foreground">{copy.instruction}</p>

        <Input
          readOnly
          value={pin ? "•".repeat(Math.max(0, pin.length - 1)) + pin.slice(-1) : ""}
          placeholder={copy.placeholder}
          className="mb-4 h-14 text-center font-mono text-xl tracking-widest"
          aria-label={copy.pinAria}
        />

        {error && (
          <p className="mb-4 text-center text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="mb-4 grid w-full grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Button
              key={d}
              type="button"
              variant="outline"
              className="h-14 text-xl font-bold"
              onClick={() => appendChar(d)}
              disabled={submitting || emailSubmitting}
            >
              {d}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-14 text-xl font-bold"
            onClick={() => appendChar("#")}
            disabled={submitting || emailSubmitting || pin.includes("#")}
          >
            #
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-14 text-xl font-bold"
            onClick={() => appendChar("0")}
            disabled={submitting || emailSubmitting}
          >
            0
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-14"
            onClick={backspace}
            disabled={submitting || emailSubmitting || pin.length === 0}
            aria-label={copy.backAria}
          >
            <Delete className="h-5 w-5" />
          </Button>
        </div>

        <Button
          type="button"
          className="h-12 w-full text-base font-bold"
          onClick={() => void handleSubmit()}
          disabled={submitting || emailSubmitting || !pinReady}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {copy.submitting}
            </>
          ) : (
            copy.submit
          )}
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{copy.emailDivider}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="staff-email">{copy.emailLabel}</Label>
            <Input
              id="staff-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="entregador@gmail.com"
            />
          </div>
          <div>
            <Label htmlFor="staff-password">{copy.passwordLabel}</Label>
            <Input
              id="staff-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => void handleEmailLogin()}
            disabled={submitting || emailSubmitting}
          >
            {emailSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {copy.emailSubmitting}
              </>
            ) : (
              copy.emailSubmit
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default StaffLogin;
