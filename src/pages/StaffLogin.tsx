import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffUiLang } from "@/hooks/useStaffUiLang";
import { markStaffSession, resolveStaffLoginDestination } from "@/lib/staffLogin";
import { getStaffLoginCopy } from "@/lib/staffUiCopy";
import StaffLanguageToggle from "@/components/StaffLanguageToggle";
import { canAccessPanel, canAccessDeliveryPanel, type StaffRole } from "@/lib/staffPermissions";

const StaffLogin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const lang = useStaffUiLang("es");
  const copy = getStaffLoginCopy(lang);
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
    } catch {
      setError(copy.loginFailed);
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

      <main className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-6 py-8 pb-10">
        <p className="mb-6 text-center text-sm text-muted-foreground">{copy.instruction}</p>

        <form className="space-y-4" onSubmit={(e) => void handleLogin(e)}>
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
              className="mt-1.5 h-12"
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
              className="mt-1.5 h-12"
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
      </main>
    </div>
  );
};

export default StaffLogin;
