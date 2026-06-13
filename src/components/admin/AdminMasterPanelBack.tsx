import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { nav } from "@/lib/navPaths";
import { canAccessGeneralAdmin } from "@/lib/staffPermissions";
import { Button } from "@/components/ui/button";

/** Atalho no painel do restaurante — só admin geral vê. */
export default function AdminMasterPanelBack() {
  const { user, loading: authLoading } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();

  if (authLoading || roleLoading || !user || !canAccessGeneralAdmin(roleData?.role)) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-bold"
      onClick={() => navigate(nav.admin())}
      aria-label="Voltar à administração geral"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Admin geral</span>
    </Button>
  );
}
