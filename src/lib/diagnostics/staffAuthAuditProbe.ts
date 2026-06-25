import { supabase } from "@/integrations/supabase/client";
import type { AuditFinding } from "@/services/adminSystemAudit";
import { listStoreDrivers } from "@/services/orderService";
import { isRpcMissingError } from "@/lib/diagnostics/rpcProbeUtils";

export async function probeStaffAuthAudit(storeId: string | null): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  if (!storeId) return findings;

  const passwordRpcs = ["manager_set_staff_password", "manager_repair_staff_login"] as const;
  let anyPasswordRpc = false;

  for (const rpcName of passwordRpcs) {
    const { error } = await (supabase.rpc as any)(rpcName, {
      _user_id: "00000000-0000-0000-0000-000000000001",
      _password: "Test1234!",
    });
    if (!error || !isRpcMissingError(String((error as { message?: string }).message))) {
      anyPasswordRpc = true;
      break;
    }
  }

  if (!anyPasswordRpc) {
    findings.push({
      id: "staff-password-rpc-missing",
      category: "team",
      severity: "critical",
      label: "Não é possível guardar senha da equipa na base de dados",
      action: "Sync + Publish na Lovable. Até lá, depende do servidor stripe-create-payment-intent actualizado.",
      link: "/panel/team",
      linkLabel: "Abrir Equipe",
    });
  } else {
    findings.push({
      id: "staff-password-rpc-ok",
      category: "team",
      severity: "ok",
      label: "Guardar senha da equipa, base de dados pronta",
    });
  }

  try {
    const drivers = await listStoreDrivers(storeId);
    if (drivers.length === 0) {
      findings.push({
        id: "staff-no-delivery",
        category: "team",
        severity: "warning",
        label: "Nenhum entregador na equipa",
        action: "Crie um membro com perfil Entregador na área Equipe.",
        link: "/panel/team",
      });
    } else {
      findings.push({
        id: "staff-delivery-count",
        category: "team",
        severity: "ok",
        label: `${drivers.length} entregador(es) na equipa`,
        detail: drivers
          .slice(0, 3)
          .map((d) => d.full_name)
          .join(", "),
      });
    }
  } catch (e) {
    findings.push({
      id: "staff-drivers-list-fail",
      category: "team",
      severity: "critical",
      label: "Não foi possível listar entregadores",
      detail: e instanceof Error ? e.message : String(e),
      link: "/panel/team",
    });
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("store_id", storeId);

  const roleList = (roles ?? []).map((r) => r.role as string);
  if (!roleList.includes("delivery")) {
    findings.push({
      id: "staff-role-delivery-missing",
      category: "team",
      severity: "warning",
      label: "Nenhum perfil Entregador registado",
      link: "/panel/team",
    });
  }

  return findings;
}
