import { supabase } from "@/integrations/supabase/client";
import type { AuditFinding } from "@/services/adminSystemAudit";
import { probeEdgeFunctionReachable, probeRpc } from "@/lib/diagnostics/rpcProbeUtils";

const DUMMY_UUID = "00000000-0000-0000-0000-000000000001";

type RpcSpec = {
  name: string;
  args: Record<string, unknown>;
  label: string;
  critical?: boolean;
  group: string;
};

const RPC_SPECS: RpcSpec[] = [
  {
    name: "manager_set_staff_password",
    args: { _user_id: DUMMY_UUID, _password: "Test1234!" },
    label: "Definir senha da equipa (RPC)",
    critical: true,
    group: "staff",
  },
  {
    name: "manager_repair_staff_login",
    args: { _user_id: DUMMY_UUID, _password: "Test1234!" },
    label: "Reparar login da equipa (RPC)",
    critical: true,
    group: "staff",
  },
  {
    name: "lookup_staff_user_by_email",
    args: { _email: "probe@test.local" },
    label: "Consultar e-mail da equipa",
    group: "staff",
  },
  {
    name: "upsert_staff_profile_by_manager",
    args: { _user_id: DUMMY_UUID, _full_name: "Probe", _preferred_language: "pt" },
    label: "Actualizar perfil da equipa",
    group: "staff",
  },
  {
    name: "add_team_member_to_store",
    args: {
      _user_id: DUMMY_UUID,
      _role: "delivery",
      _store_id: DUMMY_UUID,
      _tenant_id: DUMMY_UUID,
    },
    label: "Adicionar membro à equipa",
    group: "staff",
  },
  {
    name: "assign_delivery_driver",
    args: { _order_id: DUMMY_UUID, _driver_user_id: DUMMY_UUID },
    label: "Atribuir entregador ao pedido",
    critical: true,
    group: "delivery",
  },
  {
    name: "list_store_drivers",
    args: { _store_id: DUMMY_UUID },
    label: "Listar entregadores da loja",
    group: "delivery",
  },
  {
    name: "get_driver_deliveries",
    args: { _store_id: DUMMY_UUID },
    label: "Entregas do motorista",
    group: "delivery",
  },
  {
    name: "start_delivery",
    args: { _order_id: DUMMY_UUID },
    label: "Iniciar entrega",
    group: "delivery",
  },
  {
    name: "confirm_delivery_with_code",
    args: { _order_id: DUMMY_UUID, _code: "0000" },
    label: "Confirmar entrega com código",
    group: "delivery",
  },
  {
    name: "create_customer_order",
    args: { _store_id: DUMMY_UUID, _order_type: "takeaway", _items: [], _total: 0 },
    label: "Criar pedido do cliente",
    critical: true,
    group: "customer",
  },
  {
    name: "get_order_public",
    args: { _order_id: DUMMY_UUID },
    label: "Acompanhar pedido (público)",
    group: "customer",
  },
  {
    name: "validate_coupon",
    args: { _store_id: DUMMY_UUID, _code: "PROBE", _subtotal: 10 },
    label: "Validar cupão",
    group: "customer",
  },
  {
    name: "get_loyalty_status",
    args: { _store_id: DUMMY_UUID, _phone: "+34000000000" },
    label: "Estado de fidelidade",
    group: "customer",
  },
  {
    name: "create_seller_order",
    args: {
      _store_id: DUMMY_UUID,
      _table_number: "0",
      _customer_name: "probe",
      _items: [],
    },
    label: "Criar pedido do vendedor",
    group: "seller",
  },
  {
    name: "get_table_session_detail",
    args: { _session_id: DUMMY_UUID },
    label: "Detalhe de sessão de mesa",
    group: "seller",
  },
  {
    name: "mark_order_paid_at_counter",
    args: { _order_id: DUMMY_UUID },
    label: "Marcar pago no caixa",
    group: "ops",
  },
  {
    name: "claim_kitchen_print",
    args: { _order_id: DUMMY_UUID },
    label: "Impressão de cozinha",
    group: "ops",
  },
  {
    name: "enqueue_print_job",
    args: { _store_id: DUMMY_UUID, _ticket_data: "", _order_id: DUMMY_UUID },
    label: "Fila de impressão",
    group: "ops",
  },

];

const EDGE_FUNCTIONS: Array<{ name: string; label: string; critical?: boolean }> = [
  { name: "stripe-create-payment-intent", label: "Pagamentos Stripe + acções staff", critical: true },
  { name: "operational-diagnostics", label: "Diagnósticos operacionais" },
  { name: "create-staff-member", label: "Criar membro equipa (dedicada)" },
  { name: "update-staff-member", label: "Editar membro equipa (dedicada)" },
  { name: "create-tenant-user", label: "Criar vendedor/utilizador" },
  { name: "print-order", label: "Impressão remota", critical: true },
  { name: "send-push-notification", label: "Notificações push" },
  { name: "stripe-webhook", label: "Webhook Stripe" },
];

async function rpcCall(name: string, args: Record<string, unknown>) {
  return (supabase.rpc as any)(name, args);
}

export async function probeBackendReadiness(storeId?: string | null): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  for (const spec of RPC_SPECS) {
    const result = await probeRpc(rpcCall, spec.name, spec.args);
    if (result.status === "missing") {
      findings.push({
        id: `rpc-missing-${spec.name}`,
        category: "system",
        severity: spec.critical ? "critical" : "warning",
        label: `${spec.label} — não activa na base de dados`,
        detail: result.detail,
        action: "Faça Sync + Publish na Lovable para aplicar as actualizações da base de dados.",
        link: "/admin/diagnostics",
        linkLabel: "Estado do sistema",
      });
    } else {
      findings.push({
        id: `rpc-ok-${spec.name}`,
        category: "system",
        severity: "ok",
        label: `${spec.label} — activa`,
      });
    }
  }

  const staffPasswordMissing = findings.some(
    (f) =>
      f.severity !== "ok" &&
      (f.id === "rpc-missing-manager_set_staff_password" ||
        f.id === "rpc-missing-manager_repair_staff_login"),
  );

  for (const fn of EDGE_FUNCTIONS) {
    const { reachable, status } = await probeEdgeFunctionReachable(fn.name);
    if (!reachable) {
      const isStaffDedicated =
        fn.name === "create-staff-member" || fn.name === "update-staff-member";
      findings.push({
        id: `edge-missing-${fn.name}`,
        category: "system",
        severity:
          fn.critical || (isStaffDedicated && staffPasswordMissing)
            ? isStaffDedicated
              ? "warning"
              : "critical"
            : "warning",
        label: `${fn.label} — servidor não publicado (HTTP ${status || "?"})`,
        detail: isStaffDedicated
          ? "A app usa stripe-create-payment-intent como alternativa se estiver actualizado."
          : undefined,
        action: "Faça Sync + Publish na Lovable para publicar funções do servidor.",
        link: "/admin/diagnostics",
      });
    } else {
      findings.push({
        id: `edge-ok-${fn.name}`,
        category: "system",
        severity: "ok",
        label: `${fn.label} — servidor activo`,
      });
    }
  }

  await probeStaffEdgeAction(findings, storeId);

  return findings;
}

async function probeStaffEdgeAction(findings: AuditFinding[], storeId?: string | null) {
  if (!storeId) {
    findings.push({
      id: "edge-staff-action-skip",
      category: "team",
      severity: "suggestion",
      label: "Servidor de equipa — seleccione uma loja para testar",
    });
    return;
  }
  try {
    const { data, error } = await supabase.functions.invoke("stripe-create-payment-intent", {
      body: { action: "staff_audit_ping", store_id: storeId },
    });
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("404") || msg.includes("not found")) {
        findings.push({
          id: "edge-staff-action-missing",
          category: "team",
          severity: "critical",
          label: "Servidor de senha da equipa desactualizado",
          action: "Sync + Publish na Lovable — precisa da versão mais recente do servidor.",
          link: "/panel/team",
        });
      }
      return;
    }
    if ((data as { audit_ready?: boolean })?.audit_ready) {
      findings.push({
        id: "edge-staff-action-ok",
        category: "team",
        severity: "ok",
        label: "Servidor de senha da equipa — pronto",
      });
    } else if ((data as { ok?: boolean })?.ok && !(data as { audit_ready?: boolean })?.audit_ready) {
      findings.push({
        id: "edge-staff-action-old",
        category: "team",
        severity: "critical",
        label: "Servidor de pagamentos activo mas sem acção de equipa",
        action: "Sync + Publish na Lovable para actualizar stripe-create-payment-intent.",
        link: "/admin/diagnostics",
      });
    }
  } catch {
    findings.push({
      id: "edge-staff-action-error",
      category: "team",
      severity: "warning",
      label: "Não foi possível testar o servidor de senha da equipa",
    });
  }
}
