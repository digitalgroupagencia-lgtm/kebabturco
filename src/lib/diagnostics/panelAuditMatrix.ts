import { supabase } from "@/integrations/supabase/client";
import type { AuditFinding, AuditPanel } from "@/services/adminSystemAudit";

type PanelSection = {
  panel: AuditPanel;
  label: string;
  segment?: string;
  link?: string;
};

export const PANEL_SECTIONS: PanelSection[] = [
  { panel: "customer", label: "Cliente — cardápio e checkout", link: "/" },
  { panel: "customer", label: "Cliente — acompanhar pedido", link: "/?screen=tracking" },
  { panel: "restaurant", label: "Painel — Pedidos ao vivo", segment: "live", link: "/panel/live" },
  { panel: "restaurant", label: "Painel — Cozinha", segment: "kitchen", link: "/panel/kitchen" },
  { panel: "restaurant", label: "Painel — Caixa", segment: "cashier", link: "/panel/cashier" },
  { panel: "restaurant", label: "Painel — Mesas & QR", segment: "tables", link: "/panel/tables" },
  { panel: "restaurant", label: "Painel — Equipe", segment: "team", link: "/panel/team" },
  { panel: "restaurant", label: "Painel — Vendedores", segment: "sellers", link: "/panel/sellers" },
  { panel: "delivery", label: "Entregador — painel de entregas", link: "/delivery" },
  { panel: "seller", label: "Vendedor — mesas e pedidos", link: "/seller" },
  { panel: "admin", label: "Admin — cardápio e configuração", link: "/admin/menu" },
  { panel: "admin", label: "Admin — recebimentos Stripe", link: "/admin/finance" },
  { panel: "admin", label: "Admin — diagnósticos", link: "/admin/diagnostics" },
];

export async function probeCustomerPanel(storeId: string | null): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  if (!storeId) return findings;

  const { data: store } = await supabase
    .from("stores")
    .select("id,is_active,name")
    .eq("id", storeId)
    .maybeSingle();

  if (!store?.is_active) {
    findings.push({
      id: "customer-store-inactive",
      category: "system",
      severity: "critical",
      label: "Loja inactiva — clientes não conseguem pedir",
      panel: "customer",
      link: "/admin/stores",
    });
  } else {
    findings.push({
      id: "customer-store-active",
      category: "system",
      severity: "ok",
      label: "Loja activa para clientes",
      panel: "customer",
    });
  }

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true);

  if ((productCount ?? 0) === 0) {
    findings.push({
      id: "customer-no-products",
      category: "menu",
      severity: "critical",
      label: "Cliente — cardápio sem produtos activos",
      panel: "customer",
      link: "/admin/menu",
    });
  }

  const { count: zoneCount } = await supabase
    .from("delivery_zones")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true);

  if ((zoneCount ?? 0) === 0) {
    findings.push({
      id: "customer-no-delivery-zones",
      category: "delivery",
      severity: "warning",
      label: "Cliente — delivery sem zonas activas",
      panel: "customer",
      action: "Configure zonas de entrega se aceita pedidos delivery.",
      link: "/admin/delivery-zones",
    });
  }

  return findings;
}

export async function probeRestaurantPanel(storeId: string | null): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  if (!storeId) return findings;

  const { count: tableCount } = await supabase
    .from("tables")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true);

  if ((tableCount ?? 0) === 0) {
    findings.push({
      id: "restaurant-no-tables",
      category: "tables",
      severity: "suggestion",
      label: "Painel — sem mesas activas (modo mesa/QR)",
      panel: "restaurant",
      link: "/panel/tables",
    });
  } else {
    findings.push({
      id: "restaurant-tables-ok",
      category: "tables",
      severity: "ok",
      label: `Painel — ${tableCount} mesa(s) activa(s)`,
      panel: "restaurant",
    });
  }

  const { data: openSession } = await (supabase as any)
    .from("cash_sessions")
    .select("id")
    .eq("store_id", storeId)
    .is("closed_at", null)
    .maybeSingle();

  if (!openSession) {
    findings.push({
      id: "restaurant-cash-closed",
      category: "orders",
      severity: "suggestion",
      label: "Painel — caixa fechada",
      panel: "restaurant",
      action: "Abra a caixa se estiver a operar pagamentos em dinheiro.",
      link: "/panel/cashier",
    });
  }

  return findings;
}

export async function probeDeliveryPanel(storeId: string | null): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  if (!storeId) return findings;

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: readyOrders } = await supabase
    .from("orders")
    .select("id,order_number,assigned_driver_id")
    .eq("store_id", storeId)
    .eq("order_type", "delivery")
    .in("status", ["ready", "out_for_delivery"])
    .gte("created_at", since);

  const unassigned = (readyOrders ?? []).filter((o) => !o.assigned_driver_id);
  if (unassigned.length > 0) {
    findings.push({
      id: "delivery-unassigned-orders",
      category: "delivery",
      severity: "warning",
      label: `${unassigned.length} entrega(s) pronta(s) sem entregador atribuído`,
      panel: "delivery",
      link: "/panel/live",
      linkLabel: "Atribuir em Pedidos ao vivo",
    });
  }

  return findings;
}

export async function probeSellerPanel(tenantId: string | null): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  if (!tenantId) return findings;

  const { count: sellerCount } = await supabase
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", "seller");

  if ((sellerCount ?? 0) === 0) {
    findings.push({
      id: "seller-none",
      category: "team",
      severity: "suggestion",
      label: "Vendedor — nenhum vendedor cadastrado",
      panel: "seller",
      link: "/panel/sellers",
    });
  } else {
    findings.push({
      id: "seller-count-ok",
      category: "team",
      severity: "ok",
      label: `${sellerCount} vendedor(es) activo(s)`,
      panel: "seller",
    });
  }

  return findings;
}

export async function probeAllPanels(
  storeId: string | null,
  tenantId: string | null,
): Promise<AuditFinding[]> {
  const results = await Promise.allSettled([
    probeCustomerPanel(storeId),
    probeRestaurantPanel(storeId),
    probeDeliveryPanel(storeId),
    probeSellerPanel(tenantId),
  ]);
  const out: AuditFinding[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") out.push(...r.value);
  }
  return out;
}
