import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, LogOut, ShieldX, Smartphone, Users } from "lucide-react";
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
  const pendingText =
    lang === "pt"
      ? {
          title: "Cadastro recebido",
          body: "A sua conta foi criada com sucesso. Agora volte para o app Kebab Turco e aguarde o administrador do restaurante aprovar o seu acesso na aba Equipe.",
          step1: "Volte para o aplicativo Kebab Turco",
          step2: "O administrador aprova na aba Equipe",
          step3: "Quando for liberado, o painel abre automaticamente",
        }
      : lang === "en"
        ? {
            title: "Registration received",
            body: "Your account was created successfully. Return to the Kebab Turco app and wait for the restaurant administrator to approve your access in Team.",
            step1: "Return to the Kebab Turco app",
            step2: "The administrator approves it in Team",
            step3: "When approved, the panel opens automatically",
          }
        : {
            title: "Registro recibido",
            body: "Su cuenta se creó correctamente. Vuelva a la app Kebab Turco y espere a que el administrador del restaurante apruebe su acceso en Equipo.",
            step1: "Vuelva a la app Kebab Turco",
            step2: "El administrador aprueba en Equipo",
            step3: "Al aprobarse, el panel se abre automáticamente",
          };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-gradient-to-b from-[#3A0205] via-[#5C1419] to-background">
      <main className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-8">
        <div className="w-full max-w-md rounded-[2rem] border border-white/15 bg-background/95 p-6 text-center shadow-2xl backdrop-blur">
          {brandLogo ? (
            <img src={brandLogo} alt={brandName} className="mx-auto mb-4 h-24 w-24 object-contain drop-shadow-xl" />
          ) : (
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-xl">
              <span className="text-2xl font-black">KT</span>
            </div>
          )}

          <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-primary">
            Kebab Turco · Área da equipa
          </div>

          <h1 className="text-2xl font-black text-foreground">
            {isRejected ? copy.googleRejectedTitle : pendingText.title}
          </h1>
          {isRejected ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.googleRejectedBody}</p>
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pendingText.body}</p>
              <div className="mt-5 space-y-3 text-left">
                <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                  <Smartphone className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{pendingText.step1}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                  <Users className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{pendingText.step2}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{pendingText.step3}</span>
                </div>
              </div>
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
