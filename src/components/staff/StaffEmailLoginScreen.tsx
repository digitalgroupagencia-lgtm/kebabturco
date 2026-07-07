import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecretInput } from "@/components/ui/secret-input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffUiLang } from "@/hooks/useStaffUiLang";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useStaffLoginStore } from "@/hooks/useStaffLoginStore";
import { markStaffSession, resolveStaffLoginDestination, returnToCustomerTotemStart, isStaffSessionFlagSet, markAdminStaffAreaEntry, shouldAdminMasterStartAsCustomer } from "@/lib/staffLogin";
import { resolvePostLoginDestination } from "@/lib/authRedirect";
import { signInStaffWithGoogle } from "@/lib/staffGoogleOAuth";
import { ensureStaffLoginStoreId } from "@/lib/resolveStaffLoginStore";
import { getStaffLoginCopy } from "@/lib/staffUiCopy";
import { translateAppErrorFromException } from "@/lib/authErrorMessages";
import StaffLanguageToggle from "@/components/StaffLanguageToggle";
import StaffPendingApprovalScreen from "@/components/staff/StaffPendingApprovalScreen";
import StaffAuthWaitingScreen from "@/components/staff/StaffAuthWaitingScreen";
import { canAccessGeneralAdmin, canAccessPanel, canAccessDeliveryPanel, type StaffRole } from "@/lib/staffPermissions";
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
  loadLastStaffLogin,
  saveLastStaffLogin,
  hydrateLastStaffLogin,
  type StaffLastLogin,
} from "@/lib/staffLoginMemory";

type StaffAuthView = "login" | "signup" | "forgot" | "recovery";

function isPasswordRecoveryUrl(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.hash.includes("type=recovery")) return true;
  if (window.location.pathname.replace(/\/+$/, "") === "/senhareset") return true;
  return new URLSearchParams(window.location.search).get("mode") === "recovery";
}

function getKebabPasswordRecoveryUrl(): string {
  return "https://kebabturco.net/senhareset";
}

/** Login da equipa, e-mail + senha ou Google (pedido pendente até aprovação). */
const StaffEmailLoginScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signupFromUrl = searchParams.get("signup") === "1" || searchParams.get("mode") === "signup";
  const nextParam = searchParams.get("next");
  const initialView: StaffAuthView = signupFromUrl
    ? "signup"
    : isPasswordRecoveryUrl()
      ? "recovery"
      : "login";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authView, setAuthView] = useState<StaffAuthView>(initialView);
  const isSignup = authView === "signup";
  const isForgot = authView === "forgot";
  const isRecovery = authView === "recovery";
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffAccessStatus, setStaffAccessStatus] = useState<StaffGoogleLoginStatus | null>(null);
  const [staffAccessLoading, setStaffAccessLoading] = useState(false);
  const [lastLogin, setLastLogin] = useState<StaffLastLogin | null>(() => loadLastStaffLogin());
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthView("recovery");
        setError(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isPasswordRecoveryUrl()) {
      setAuthView("recovery");
    }
  }, []);

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
    if (isSignup) return;
    void hydrateLastStaffLogin().then((saved) => {
      if (saved) setLastLogin(saved);
    });
    setDismissedSuggestion(false);
  }, [isSignup]);

  useEffect(() => {
    if (!roleData?.role) return;
    if (hasStaffGoogleLoginIntent()) consumeStaffGoogleLoginIntent();
    setStaffAccessLoading(false);
    setStaffAccessStatus("active");
  }, [roleData?.role]);

  useEffect(() => {
    if (authLoading || roleLoading || !user) return;
    if (!roleData?.role) return;
    // Só redirecciona após login explícito da equipa — não quando a sessão sobreviveu a um logout.
    if (!isStaffSessionFlagSet()) return;

    void (async () => {
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
    if (!user || staffAccessLoading) return;
    const role = roleData?.role as StaffRole | undefined;
    if (!role) return;
    if (canAccessGeneralAdmin(role)) {
      if (shouldAdminMasterStartAsCustomer({ role, pathname: window.location.pathname })) {
        navigate({ pathname: nav.home(), search: "?screen=language" }, { replace: true });
        return;
      }
      markAdminStaffAreaEntry();
      navigate(resolveStaffLoginDestination(role), { replace: true });
      return;
    }
    if (staffAccessStatus !== "active") return;
    if (!isStaffSessionFlagSet()) return;
    navigate(resolveStaffLoginDestination(role), { replace: true });
  }, [user, staffAccessLoading, staffAccessStatus, roleData?.role, navigate]);

  useEffect(() => {
    if (searchParams.get("logout") !== "1") return;
    if (authLoading) return;
    if (!user) {
      const params = new URLSearchParams(searchParams);
      params.delete("logout");
      const q = params.toString();
      navigate({ pathname: nav.staff(), search: q ? `?${q}` : "" }, { replace: true });
      return;
    }
    void (async () => {
      await supabase.auth.signOut({ scope: "local" });
      try {
        localStorage.removeItem("kebabturco-auth");
      } catch {
        /* ignore */
      }
    })();
  }, [authLoading, user, searchParams, navigate]);

  const handleForgotPassword = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!email.trim()) {
      setError(copy.forgotEmailRequired);
      return;
    }

    setSubmitting(true);
    setError(null);
    setForgotSent(false);

    try {
      // Sempre usar o domínio oficial: evita auth-bridge/login da Lovable quando o pedido sai do preview.
      const redirectTo = getKebabPasswordRecoveryUrl();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      });
      if (resetError) throw resetError;
      setForgotSent(true);
      toast.success(copy.forgotSuccess);
    } catch (e) {
      setError(translateAppErrorFromException(e, lang === "en" ? "es" : lang));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetNewPassword = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!password || password.length < 6) {
      setError(copy.recoveryTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(copy.recoveryMismatch);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      markStaffSession();
      toast.success(copy.recoverySuccess);
      setPassword("");
      setConfirmPassword("");
      setAuthView("login");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("mode");
        url.hash = "";
        window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      }
    } catch (e) {
      setError(translateAppErrorFromException(e, lang === "en" ? "es" : lang));
    } finally {
      setSubmitting(false);
    }
  };

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
          setAuthView("login");
          return;
        }
        toast.success(copy.signupSuccess);
        setAuthView("login");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;
      markStaffSession();
      saveLastStaffLogin({ email: email.trim().toLowerCase(), method: "password" });
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
      const nextQuery = nextParam ? `?next=${encodeURIComponent(nextParam)}` : "";
      const redirectUri = `${window.location.origin}${nav.staff()}${nextQuery}`;
      await signInStaffWithGoogle({ redirectUri, lang });
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.googleError);
      setGoogleSubmitting(false);
      clearStaffGoogleLoginIntent();
    }
  };

  useEffect(() => {
    if (!user?.email) return;
    saveLastStaffLogin({
      email: user.email,
      method: userSignedInWithGoogle(user) ? "google" : "password",
      name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
    });
    setLastLogin(loadLastStaffLogin());
  }, [user]);

  const applyLastLoginSuggestion = () => {
    if (!lastLogin) return;
    if (lastLogin.method === "google") {
      void handleGoogleLogin();
      return;
    }
    setEmail(lastLogin.email);
    setError(null);
    passwordRef.current?.focus();
  };

  const showLastLoginSuggestion = !isSignup && !isForgot && !isRecovery && lastLogin && !dismissedSuggestion;

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
            <h1 className="text-2xl font-bold leading-tight text-foreground">
              {isForgot ? copy.forgotTitle : isRecovery ? copy.recoveryTitle : copy.title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{copy.subtitle}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {isForgot
                ? copy.forgotInstruction
                : isRecovery
                  ? copy.recoveryInstruction
                  : isSignup
                    ? copy.signupInstruction
                    : copy.instruction}
            </p>
          </div>

          {forgotSent && isForgot && (
            <p className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm text-foreground">
              {copy.forgotSuccess}
            </p>
          )}

          {showLastLoginSuggestion && (
            <div className="mb-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.lastLoginLabel}
              </p>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border-2 border-primary/35 bg-primary/5 p-3 text-left transition-colors hover:border-primary hover:bg-primary/10"
                onClick={applyLastLoginSuggestion}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <User className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{lastLogin.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {lastLogin.method === "google" ? copy.lastLoginContinueGoogle : copy.lastLoginContinue}
                  </p>
                </div>
              </button>
              <button
                type="button"
                className="w-full py-1 text-center text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setDismissedSuggestion(true);
                  if (email === lastLogin.email) setEmail("");
                }}
              >
                {copy.lastLoginOther}
              </button>
            </div>
          )}

          {isForgot ? (
            <form className="space-y-4" onSubmit={(e) => void handleForgotPassword(e)}>
              <div className="space-y-1.5">
                <Label htmlFor="staff-email-forgot">{copy.emailLabel}</Label>
                <Input
                  id="staff-email-forgot"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                    setForgotSent(false);
                  }}
                  placeholder="entregador@gmail.com"
                  className="h-12 w-full"
                />
              </div>

              {error && (
                <p className="text-center text-sm font-medium text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="h-12 w-full text-base font-bold" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {copy.forgotSubmitting}
                  </>
                ) : (
                  copy.forgotSubmit
                )}
              </Button>

              <button
                type="button"
                className="w-full py-2 text-center text-sm font-semibold text-primary hover:underline"
                onClick={() => {
                  setAuthView("login");
                  setError(null);
                  setForgotSent(false);
                }}
              >
                {copy.forgotBack}
              </button>
            </form>
          ) : isRecovery ? (
            <form className="space-y-4" onSubmit={(e) => void handleSetNewPassword(e)}>
              <div className="space-y-1.5">
                <Label htmlFor="staff-password-new">{copy.recoveryPasswordLabel}</Label>
                <SecretInput
                  id="staff-password-new"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="h-12 w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-password-confirm">{copy.recoveryConfirmLabel}</Label>
                <SecretInput
                  id="staff-password-confirm"
                  name="password-confirm"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
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

              <Button type="submit" className="h-12 w-full text-base font-bold" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {copy.recoverySubmitting}
                  </>
                ) : (
                  copy.recoverySubmit
                )}
              </Button>
            </form>
          ) : (
          <form className="space-y-4" onSubmit={(e) => void handleLogin(e)}>
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
                name="email"
                type="email"
                autoComplete="email"
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
              <SecretInput
                ref={passwordRef}
                id="staff-password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="h-12 w-full"
              />
              {!isSignup && (
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:underline"
                  onClick={() => {
                    setAuthView("forgot");
                    setError(null);
                    setForgotSent(false);
                  }}
                >
                  {copy.forgotLink}
                </button>
              )}
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
          )}

          {!isForgot && !isRecovery && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? copy.loginToggle : copy.signupToggle}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setAuthView(isSignup ? "login" : "signup");
                setError(null);
              }}
            >
              {isSignup ? copy.loginLink : copy.signupLink}
            </button>
          </p>
          )}

          {!isSignup && !isForgot && !isRecovery && (
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
