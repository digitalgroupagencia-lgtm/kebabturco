import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffUiLang } from "@/hooks/useStaffUiLang";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useStaffLoginStore } from "@/hooks/useStaffLoginStore";
import { markStaffSession, resolveStaffLoginDestination, returnToCustomerTotemStart, isStaffSessionFlagSet } from "@/lib/staffLogin";
import { resolvePostLoginDestination } from "@/lib/authRedirect";
import { signInStaffWithGoogle } from "@/lib/staffGoogleOAuth";
import { ensureStaffLoginStoreId } from "@/lib/resolveStaffLoginStore";
import { getStaffLoginCopy } from "@/lib/staffUiCopy";
import { translateAppErrorFromException } from "@/lib/authErrorMessages";
import StaffLanguageToggle from "@/components/StaffLanguageToggle";
import StaffPendingApprovalScreen from "@/components/staff/StaffPendingApprovalScreen";
import StaffAuthWaitingScreen from "@/components/staff/StaffAuthWaitingScreen";
import { canAccessPanel, canAccessDeliveryPanel, type StaffRole } from "@/lib/staffPermissions";
import { nav } from "@/lib/navPaths";
import {
  registerStaffGoogleLoginWithRetry,
  userHasAnyStaffRole,
  userHasRoleAtStore,
  userSignedInWithGoogle,
  type StaffGoogleLoginStatus,
} from "@/services/staffGoogleLogin";
import {
  clearStaffGoogleLoginIntent,
  consumeStaffGoogleLoginIntent,
  hasStaffGoogleLoginIntent,
} from "@/lib/staffGoogleLoginIntent";
import {
  markIosPasswordLoginSubmitted,
  staffLoginFormAction,
  waitForIosPasswordSaveGrace,
} from "@/lib/iosPasswordAutofill";

/** Login da equipa, e-mail + senha ou Google (pedido pendente até aprovação). */
const StaffEmailLoginScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signupFromUrl = searchParams.get("signup") === "1" || searchParams.get("mode") === "signup";
  const nextParam = searchParams.get("next");
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
  const [fullName, setFullName] = useState("");
  const [isSignup, setIsSignup] = useState(signupFromUrl);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffAccessStatus, setStaffAccessStatus] = useState<StaffGoogleLoginStatus | null>(null);
  const [staffAccessLoading, setStaffAccessLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const googleOAuthReturn =
    (hasStaffGoogleLoginIntent() && !roleData?.role) ||
    Boolean(user && userSignedInWithGoogle(user) && !roleData?.role);

  const accessFlowActive =
    googleOAuthReturn ||
    staffAccessLoading ||
    staffAccessStatus === "pending" ||
    staffAccessStatus === "rejected" ||
    Boolean(user && !roleData?.role && isStaffSessionFlagSet());

  const showStaffPending =
    user &&
    !roleData?.role &&
    staffAccessStatus !== "rejected" &&
    (staffAccessStatus === "pending" || staffAccessLoading || (googleOAuthReturn && staffAccessStatus !== "active"));

  useEffect(() => {
    if (!roleData?.role) return;
    if (hasStaffGoogleLoginIntent()) consumeStaffGoogleLoginIntent();
    setStaffAccessLoading(false);
    setStaffAccessStatus("active");
  }, [roleData?.role]);

  useEffect(() => {
    if (authLoading || roleLoading || !user) return;
    if (!roleData?.role) return;

    void (async () => {
      await waitForIosPasswordSaveGrace();

      if (nextParam) {
        const dest = await resolvePostLoginDestination(user.id, nextParam);
        navigate(dest.path, { replace: true });
        return;
      }

      const role = roleData?.role as StaffRole | undefined;
      if (!role) return;

      if (canAccessDeliveryPanel(role) && role === "delivery") {
        navigate(resolveStaffLoginDestination(role), { replace: true });
        return;
      }
      if (canAccessPanel(role) || role === "admin_master" || role === "seller") {
        navigate(resolveStaffLoginDestination(role), { replace: true });
      }
    })();
  }, [authLoading, roleLoading, user, roleData?.role, navigate, nextParam]);

  useEffect(() => {
    if (authLoading || roleLoading || !user) return;
    if (roleData?.role) {
      consumeStaffGoogleLoginIntent();
      return;
    }
    if (storeLoading) return;

    let cancelled = false;
    setStaffAccessLoading(true);

    void (async () => {
      try {
        const resolvedStoreId = storeId ?? (await ensureStaffLoginStoreId());
        const alreadyAtStore =
          (await userHasRoleAtStore(user.id, resolvedStoreId)) ||
          (await userHasAnyStaffRole(user.id));
        if (alreadyAtStore) {
          consumeStaffGoogleLoginIntent();
          if (!cancelled) setStaffAccessStatus("active");
          return;
        }

        const result = await registerStaffGoogleLoginWithRetry(resolvedStoreId);
        consumeStaffGoogleLoginIntent();
        if (!cancelled) setStaffAccessStatus(result.status);
      } catch (e) {
        console.error("[staff-access] register on login screen failed", e);
        if (!cancelled) {
          setStaffAccessStatus("pending");
          setError(null);
        }
      } finally {
        if (!cancelled) setStaffAccessLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, roleLoading, user, roleData?.role, storeId, storeLoading]);

  useEffect(() => {
    if (!user || staffAccessLoading || staffAccessStatus !== "active") return;
    const role = roleData?.role as StaffRole | undefined;
    if (!role) return;
    void (async () => {
      await waitForIosPasswordSaveGrace();
      navigate(resolveStaffLoginDestination(role), { replace: true });
    })();
  }, [user, staffAccessLoading, staffAccessStatus, roleData?.role, navigate]);

  const handleLogin = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!email.trim() || !password) {
      setError(copy.loginFailed);
      return;
    }

    if (isSignup && !fullName.trim()) {
      setError(copy.nameLabel);
      return;
    }

    setSubmitting(true);
    setError(null);

    const registerPendingAccess = async () => {
      const resolvedStoreId = storeId ?? (await ensureStaffLoginStoreId());
      const result = await registerStaffGoogleLoginWithRetry(resolvedStoreId);
      setStaffAccessStatus(result.status);
      return result;
    };

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}${nav.staff()}`,
          },
        });
        if (signUpError) throw signUpError;
        markStaffSession();
        if (data.session?.user) {
          await registerPendingAccess();
          toast.success(copy.signupSuccess);
          setIsSignup(false);
          return;
        }
        toast.success(copy.signupSuccess);
        setIsSignup(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;
      markStaffSession();
      markIosPasswordLoginSubmitted();
      if (!roleData?.role) {
        await registerPendingAccess();
      }
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
      // Use the site origin as redirect_uri to keep it inside the Lovable OAuth broker
      // allow-list and avoid "State verification failed" in mobile Safari (cookies/cross-site).
      // The post-login staff destination is resolved from the staff Google login intent flag.
      try {
        if (nextParam) sessionStorage.setItem("kebab-staff-google-next", nextParam);
      } catch { /* ignore */ }
      const redirectUri = `${window.location.origin}/`;
      await signInStaffWithGoogle({ redirectUri, lang });
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.googleError);
      setGoogleSubmitting(false);
      clearStaffGoogleLoginIntent();
    }
  };

  if (authLoading || (user && roleLoading) || (user && accessFlowActive && staffAccessLoading && !staffAccessStatus)) {
    return (
      <StaffAuthWaitingScreen
        title={copy.googleReturning}
        message={copy.googleReturningBody}
      />
    );
  }

  if (showStaffPending) {
    return <StaffPendingApprovalScreen status="pending" email={user?.email} />;
  }

  if (user && staffAccessStatus === "rejected") {
    return <StaffPendingApprovalScreen status="rejected" email={user.email} />;
  }

  if (user && userSignedInWithGoogle(user) && staffAccessLoading) {
    return (
      <StaffAuthWaitingScreen
        title={copy.googleReturning}
        message={copy.googleReturningBody}
      />
    );
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

      <main className="flex flex-1 items-start justify-center overflow-y-auto overscroll-y-contain px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            {brandLogo && (
              <img src={brandLogo} alt={brandName} className="mb-5 h-28 w-28 object-contain drop-shadow-xl" />
            )}
            <h1 className="text-2xl font-bold leading-tight text-foreground">{copy.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{copy.subtitle}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {isSignup ? copy.signupInstruction : copy.instruction}
            </p>
          </div>

          <form
            id="staff-login-form"
            className="space-y-4"
            method="post"
            action={staffLoginFormAction()}
            autoComplete="on"
            onSubmit={(e) => void handleLogin(e)}
          >
            {isSignup && (
              <div className="space-y-1.5">
                <Label htmlFor="staff-name">{copy.nameLabel}</Label>
                <Input
                  id="staff-name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setError(null);
                  }}
                  placeholder={copy.nameLabel}
                  className="h-12 w-full"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">{copy.emailLabel}</Label>
              <Input
                id="staff-email"
                name="username"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="entregador@gmail.com"
                className="h-12 w-full"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-password">{copy.passwordLabel}</Label>
              <Input
                ref={passwordRef}
                id="staff-password"
                name="password"
                type="password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="h-12 w-full"
                required
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
                  {isSignup ? copy.signupSubmitting : copy.submitting}
                </>
              ) : isSignup ? (
                copy.signupSubmit
              ) : (
                copy.submit
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? copy.loginToggle : copy.signupToggle}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setIsSignup((v) => !v);
                setError(null);
              }}
            >
              {isSignup ? copy.loginLink : copy.signupLink}
            </button>
          </p>

          {!isSignup && (
            <>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default StaffEmailLoginScreen;
