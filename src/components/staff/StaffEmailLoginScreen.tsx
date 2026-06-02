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
import { markStaffSession, resolveStaffLoginDestination } from "@/lib/staffLogin";
import { getStaffLoginCopy } from "@/lib/staffUiCopy";
import { translateAppErrorFromException } from "@/lib/authErrorMessages";
import StaffLanguageToggle from "@/components/StaffLanguageToggle";
import { canAccessPanel, canAccessDeliveryPanel, type StaffRole } from "@/lib/staffPermissions";

/** Login da equipa — só correo/e-mail + contraseña/senha (sem código numérico). */
const StaffEmailLoginScreen = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const lang = useStaffUiLang("es");
  const copy = getStaffLoginCopy(lang);
  const { settings } = useBranding();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const brandLogo =
    (isDark && (settings as any)?.logo_main_dark_url) ||
    settings?.logo_main_url ||
    null;
  const brandName = settings?.company_name || "Logo";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (authLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{copy.loading}</p>
        </div>
      </div>
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
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <StaffLanguageToggle compact defaultLang="es" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-primary/5 ring-1 ring-primary/15">
              <img src={brandLogo} alt="Logo" className="h-full w-full object-contain p-2" />
            </div>
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

            <Button type="submit" className="h-12 w-full text-base font-bold" disabled={submitting}>
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
        </div>
      </main>
    </div>
  );
};

export default StaffEmailLoginScreen;
