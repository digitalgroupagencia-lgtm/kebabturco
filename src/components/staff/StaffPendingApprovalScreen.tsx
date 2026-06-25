import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Loader2, LogOut, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffUiLang } from "@/hooks/useStaffUiLang";
import { useBranding } from "@/contexts/BrandingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getStaffLoginCopy } from "@/lib/staffUiCopy";
import { markStaffSession, resolveStaffLoginDestination } from "@/lib/staffLogin";
import { useStaffLoginStore } from "@/hooks/useStaffLoginStore";
import { ensureStaffLoginStoreId } from "@/lib/resolveStaffLoginStore";
import { registerStaffGoogleLoginWithRetry } from "@/services/staffGoogleLogin";
import type { StaffGoogleLoginStatus } from "@/services/staffGoogleLogin";
import type { StaffRole } from "@/lib/staffPermissions";
import { canAccessDeliveryPanel, canAccessPanel } from "@/lib/staffPermissions";

type Props = {
  status: StaffGoogleLoginStatus;
  email?: string | null;
};

export default function StaffPendingApprovalScreen({ status, email }: Props) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const lang = useStaffUiLang("es");
  const copy = getStaffLoginCopy(lang);
  const { settings } = useBranding();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const brandLogo =
    (isDark && (settings as { logo_main_dark_url?: string })?.logo_main_dark_url) ||
    settings?.logo_main_url ||
    null;
  const brandName = settings?.company_name || "Kebab Turco";
  const { storeId } = useStaffLoginStore();
  const [checking, setChecking] = useState(status === "pending");

  useEffect(() => {
    markStaffSession();
  }, []);

  useEffect(() => {
    if (status !== "pending" || !user?.id) return;

    void (async () => {
      try {
        const resolvedStoreId = storeId ?? (await ensureStaffLoginStoreId());
        await registerStaffGoogleLoginWithRetry(resolvedStoreId);
      } catch {
        /* mantém ecrã de espera, não mostrar erro ao utilizador */
      }
    })();
  }, [status, user?.id, storeId]);

  useEffect(() => {
    if (roleLoading || !user || !roleData?.role) return;
    const role = roleData.role as StaffRole;
    if (canAccessDeliveryPanel(role) && role === "delivery") {
      navigate(resolveStaffLoginDestination(role), { replace: true });
      return;
    }
    if (canAccessPanel(role) || role === "admin_master" || role === "seller") {
      navigate(resolveStaffLoginDestination(role), { replace: true });
    }
  }, [roleLoading, user, roleData?.role, navigate]);

  useEffect(() => {
    if (status !== "pending" || !user?.id) {
      setChecking(false);
      return;
    }

    const pollRole = async () => {
      setChecking(true);
      try {
        const { data } = await supabase.rpc("get_my_staff_context" as never);
        const row = data as { role?: string } | null;
        if (row?.role) {
          navigate(resolveStaffLoginDestination(row.role as StaffRole), { replace: true });
        }
      } finally {
        window.setTimeout(() => setChecking(false), 800);
      }
    };

    void pollRole();
    const timer = window.setInterval(() => void pollRole(), 4000);
    return () => window.clearInterval(timer);
  }, [status, user?.id, navigate]);

  const isRejected = status === "rejected";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <main className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-md text-center">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              className="mx-auto mb-5 h-20 w-20 object-contain drop-shadow-lg"
            />
          ) : null}

          <div
            className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${
              isRejected ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            }`}
          >
            {isRejected ? <ShieldX className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            {isRejected ? copy.googleRejectedTitle : copy.googlePendingTitle}
          </h1>
          {isRejected ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.googleRejectedBody}</p>
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.googleReturnSuccess}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.googlePendingBody}</p>
            </>
          )}

          {email && (
            <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground">
              {email}
            </p>
          )}

          {!isRejected && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {checking ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
              <span>{copy.googlePendingHint}</span>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="mt-8 h-11 w-full"
            onClick={() => void signOut("/staff")}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {copy.googleSignOut}
          </Button>
        </div>
      </main>
    </div>
  );
}
