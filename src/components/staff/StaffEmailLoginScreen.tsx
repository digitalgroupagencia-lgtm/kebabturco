import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffUiLang } from "@/hooks/useStaffUiLang";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useStaffLoginStore } from "@/hooks/useStaffLoginStore";
import { markStaffSession, resolveStaffLoginDestination, returnToCustomerTotemStart } from "@/lib/staffLogin";
import { signInStaffWithGoogle } from "@/lib/staffGoogleOAuth";
import { getStaffLoginCopy } from "@/lib/staffUiCopy";
import { translateAppErrorFromException } from "@/lib/authErrorMessages";
import StaffLanguageToggle from "@/components/StaffLanguageToggle";
import StaffPendingApprovalScreen from "@/components/staff/StaffPendingApprovalScreen";
import StaffAuthWaitingScreen from "@/components/staff/StaffAuthWaitingScreen";
import { canAccessPanel, canAccessDeliveryPanel, type StaffRole } from "@/lib/staffPermissions";
import { nav } from "@/lib/navPaths";
import {
  registerStaffGoogleLogin,
  userSignedInWithGoogle,
  type StaffGoogleLoginStatus,
} from "@/services/staffGoogleLogin";

/** Login da equipa — e-mail + senha ou Google (pedido pendente até aprovação). */
const StaffEmailLoginScreen = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const { storeId, loading: storeLoading } = useStaffLoginStore();
  const lang = useStaffUiLang("es");
  const copy = getStaffLoginCopy(lang);
  const { settings } = useBranding();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const brandLogo =
    (isDark && (settings as { logo_main_dark_url?: string })?.logo_main_dark_url) ||
    settings?.logo_main_url ||
    null;
  const brandName = settings?.company_name || "Logo";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<StaffGoogleLoginStatus | null>(null);
  const [googleStatusLoading, setGoogleStatusLoading] = useState(false);

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

  useEffect(() => {
    if (authLoading || roleLoading || !user || roleData?.role) {
      setGoogleStatus(null);
      return;
    }

    if (!userSignedInWithGoogle(user)) {
      setGoogleStatus(null);
      return;
    }

    if (!storeId) return;

    let cancelled = false;
    setGoogleStatusLoading(true);

    void (async () => {
      try {
        const result = await registerStaffGoogleLogin(storeId);
        if (!cancelled) setGoogleStatus(result.status);
      } catch (e) {
        if (!cancelled) {
          setError(translateAppErrorFromException(e, lang === "en" ? "es" : lang));
          setGoogleStatus("pending");
        }
      } finally {
        if (!cancelled) setGoogleStatusLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, roleLoading, user, roleData?.role, storeId, lang]);

  const handleLogin = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!email.trim() || !password) {
      setError(copy.loginFailed);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;
      markStaffSession();
    } catch (e) {
      setError(translateAppErrorFromException(e, lang === "en" ? "es" : lang));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (storeLoading) {
      setError(copy.loading);
      return;
    }

    if (!storeId) {
      setError(copy.googleError);
      return;
    }

    setGoogleSubmitting(true);
    setError(null);
    markStaffSession();

    try {
      const redirectUri = `${window.location.origin}${nav.staff()}`;
      await signInStaffWithGoogle({ redirectUri, lang });
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.googleError);
      setGoogleSubmitting(false);
    }
  };

  if (authLoading || (user && roleLoading) || (user && userSignedInWithGoogle(user) && googleStatusLoading)) {
    return (
      <StaffAuthWaitingScreen
        title={user && userSignedInWithGoogle(user) ? copy.googleReturning : copy.loading}
        message={user && userSignedInWithGoogle(user) ? copy.googlePendingHint : undefined}
      />
    );
  }

  if (user && !roleData?.role && userSignedInWithGoogle(user) && googleStatus) {
    return <StaffPendingApprovalScreen status={googleStatus} email={user.email} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background" data-staff-login="email-password">
      <header className="shrink-0 border-b bg-card/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={copy.backAria}
            onClick={() => returnToCustomerTotemStart(navigate)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <StaffLanguageToggle compact defaultLang="es" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            {brandLogo && (
              <img src={brandLogo} alt={brandName} className="mb-5 h-28 w-28 object-contain drop-shadow-xl" />
            )}
            <h1 className="text-2xl font-bold leading-tight text-foreground">{copy.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{copy.subtitle}</p>
            <p className="mt-4 text-sm text-muted-foreground">{copy.instruction}</p>
          </div>

          <form className="space-y-4" onSubmit={(e) => void handleLogin(e)}>
            <div className="space-y-1.5">
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
                className="h-12 w-full"
              />
            </div>
            <div className="space-y-1.5">
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
                className="h-12 w-full"
              />
            </div>

            {error && (
              <p className="text-center text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="h-12 w-full text-base font-bold" disabled={submitting || googleSubmitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {copy.submitting}
                </>
              ) : (
                copy.submit
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.googleDivider}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full text-base font-bold"
            disabled={submitting || googleSubmitting || !storeId || storeLoading}
            onClick={() => void handleGoogleLogin()}
          >
            {googleSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {copy.googleSubmitting}
              </>
            ) : (
              copy.googleButton
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default StaffEmailLoginScreen;
