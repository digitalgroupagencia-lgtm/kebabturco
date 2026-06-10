import { supabase as _client } from "@/integrations/supabase/client";
import { fetchStorePayoutIntake } from "@/services/payoutIntakeService";

const supabase = _client as unknown as any;

export type AuditSeverity = "critical" | "warning" | "suggestion" | "ok";
export type AuditCategory =
  | "menu"
  | "orders"
  | "payments"
  | "delivery"
  | "tables"
  | "team"
  | "system"
  | "printing";

export type AuditPanel =
  | "customer"
  | "restaurant"
  | "delivery"
  | "seller"
  | "admin"
  | "backend";

export type AuditFinding = {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  label: string;
  detail?: string;
  action?: string;
  /** Caminho interno para resolver (relativo, ex: /admin/menu). */
  link?: string;
  linkLabel?: string;
  /** Área da app (cliente, painel, entregador, etc.). */
  panel?: AuditPanel;
};

function jsonbName(name: any): string {
  if (!name) return "";
  if (typeof name === "string") return name;
  if (typeof name === "object") {
    return (
      name.pt ||
      name.en ||
      name.es ||
      name.fr ||
      Object.values(name).find((v) => typeof v === "string" && v.length > 0) ||
      ""
    );
  }
  return "";
}

// ---------- CARDÁPIO ----------
async function auditMenu(storeId: string | null): Promise<AuditFinding[]> {
  if (!storeId) return [];
  const findings: AuditFinding[] = [];

  const [products, categories] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,price,image_url,is_active,category_id")
      .eq("store_id", storeId),
    supabase.from("categories").select("id,name").eq("store_id", storeId),
  ]);

  const rows: any[] = products.data ?? [];
  const cats: any[] = categories.data ?? [];

  const noImage = rows.filter((p) => p.is_active && !p.image_url);
  if (noImage.length > 0) {
    findings.push({
      id: "menu-no-image",
      category: "menu",
      severity: "warning",
      label: `${noImage.length} produto(s) sem imagem`,
      detail: noImage
        .slice(0, 3)
        .map((p) => jsonbName(p.name))
        .filter(Boolean)
        .join(", "),
      action: "Adicione uma imagem em Cardápio → Editar produto.",
      link: "/admin/menu",
      linkLabel: "Abrir cardápio",
    });
  }

  const noPrice = rows.filter((p) => p.is_active && (!p.price || Number(p.price) <= 0));
  if (noPrice.length > 0) {
    findings.push({
      id: "menu-no-price",
      category: "menu",
      severity: "critical",
      label: `${noPrice.length} produto(s) ativos sem preço`,
      detail: noPrice
        .slice(0, 3)
        .map((p) => jsonbName(p.name))
        .filter(Boolean)
        .join(", "),
      action: "Defina o preço — produtos sem preço impedem o checkout.",
      link: "/admin/menu",
      linkLabel: "Abrir cardápio",
    });
  }

  const noCategory = rows.filter((p) => !p.category_id);
  if (noCategory.length > 0) {
    findings.push({
      id: "menu-no-category",
      category: "menu",
      severity: "warning",
      label: `${noCategory.length} produto(s) sem categoria`,
      action: "Atribua uma categoria a cada produto.",
      link: "/admin/menu",
    });
  }

  // categorias vazias
  const productsByCat = new Map<string, number>();
  for (const p of rows) {
    if (!p.category_id) continue;
    productsByCat.set(p.category_id, (productsByCat.get(p.category_id) ?? 0) + 1);
  }
  const emptyCats = cats.filter((c) => !productsByCat.has(c.id));
  if (emptyCats.length > 0) {
    findings.push({
      id: "menu-empty-cats",
      category: "menu",
      severity: "suggestion",
      label: `${emptyCats.length} categoria(s) vazia(s)`,
      detail: emptyCats.slice(0, 3).map((c) => jsonbName(c.name)).filter(Boolean).join(", "),
      action: "Adicione produtos ou remova as categorias vazias.",
      link: "/admin/menu",
    });
  }

  // duplicados por nome
  const nameCount = new Map<string, number>();
  for (const p of rows) {
    const key = jsonbName(p.name).trim().toLowerCase();
    if (!key) continue;
    nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
  }
  const dupes = Array.from(nameCount.entries()).filter(([, c]) => c > 1);
  if (dupes.length > 0) {
    findings.push({
      id: "menu-duplicates",
      category: "menu",
      severity: "suggestion",
      label: `${dupes.length} produto(s) duplicado(s) por nome`,
      detail: dupes.slice(0, 3).map(([n]) => n).join(", "),
      link: "/admin/menu",
    });
  }

  if (rows.length === 0) {
    findings.push({
      id: "menu-empty",
      category: "menu",
      severity: "critical",
      label: "Cardápio vazio",
      action: "Cadastre produtos para abrir vendas.",
      link: "/admin/menu",
    });
  }

  return findings;
}

// ---------- PEDIDOS ----------
async function auditOrders(storeId: string | null): Promise<AuditFinding[]> {
  if (!storeId) return [];
  const findings: AuditFinding[] = [];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("orders")
    .select(
      "id,status,payment_status,payment_method,order_type,created_at,estimated_ready_at,total"
    )
    .eq("store_id", storeId)
    .gte("created_at", since);

  const orders: any[] = data ?? [];

  const stuckPreparing = orders.filter((o) => {
    if (o.status !== "preparing") return false;
    const age = Date.now() - new Date(o.created_at).getTime();
    return age > 45 * 60 * 1000;
  });
  if (stuckPreparing.length > 0) {
    findings.push({
      id: "orders-stuck-preparing",
      category: "orders",
      severity: "critical",
      label: `${stuckPreparing.length} pedido(s) em preparação há +45 min`,
      action: "Reveja na fila — podem estar travados.",
      link: "/panel/live",
      linkLabel: "Abrir Pedidos ao vivo",
    });
  }

  const pendingNoAction = orders.filter((o) => {
    if (o.status !== "pending") return false;
    const age = Date.now() - new Date(o.created_at).getTime();
    return age > 10 * 60 * 1000;
  });
  if (pendingNoAction.length > 0) {
    findings.push({
      id: "orders-pending-old",
      category: "orders",
      severity: "warning",
      label: `${pendingNoAction.length} pedido(s) recebidos sem ação (+10 min)`,
      action: "Aceite ou recuse no painel ao vivo.",
      link: "/panel/live",
    });
  }

  const cashPending = orders.filter(
    (o) =>
      o.payment_method === "cash" &&
      o.payment_status === "pending" &&
      (o.order_type === "dine_in" || o.order_type === "takeaway")
  );
  if (cashPending.length > 0) {
    findings.push({
      id: "orders-cash-pending",
      category: "orders",
      severity: "warning",
      label: `${cashPending.length} pedido(s) mesa/balcão em dinheiro pendentes`,
      action: "Confirme o pagamento no card ou no Caixa.",
      link: "/panel/cashier",
      linkLabel: "Abrir Caixa",
    });
  }

  const deliveredUnpaid = orders.filter(
    (o) => o.status === "completed" && o.payment_status === "pending"
  );
  if (deliveredUnpaid.length > 0) {
    findings.push({
      id: "orders-delivered-unpaid",
      category: "orders",
      severity: "critical",
      label: `${deliveredUnpaid.length} pedido(s) concluído(s) sem pagamento`,
      link: "/panel/cashier",
    });
  }

  const noEta = orders.filter((o) => o.status === "preparing" && !o.estimated_ready_at);
  if (noEta.length > 0) {
    findings.push({
      id: "orders-no-eta",
      category: "orders",
      severity: "suggestion",
      label: `${noEta.length} pedido(s) sem tempo estimado`,
      action: "Defina o tempo padrão em Configurações.",
      link: "/admin/settings",
    });
  }

  return findings;
}

// ---------- DELIVERY ----------
async function auditDelivery(storeId: string | null): Promise<AuditFinding[]> {
  if (!storeId) return [];
  const findings: AuditFinding[] = [];

  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("id,is_active")
    .eq("store_id", storeId);

  if (!zones || zones.length === 0) {
    findings.push({
      id: "delivery-no-zones",
      category: "delivery",
      severity: "warning",
      label: "Nenhuma zona de entrega cadastrada",
      action: "Defina as zonas para aceitar delivery.",
      link: "/admin/delivery-zones",
    });
  }

  // pedidos delivery sem entregador
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: orders } = await supabase
    .from("orders")
    .select("id,status,order_type,assigned_driver_id")
    .eq("store_id", storeId)
    .eq("order_type", "delivery")
    .in("status", ["ready", "out_for_delivery"])
    .gte("created_at", since);

  const noDriver = (orders ?? []).filter((o: any) => !o.assigned_driver_id);
  if (noDriver.length > 0) {
    findings.push({
      id: "delivery-no-driver",
      category: "delivery",
      severity: "critical",
      label: `${noDriver.length} pedido(s) delivery sem entregador`,
      panel: "restaurant",
      link: "/panel/live",
    });
  }

  return findings;
}

// ---------- EQUIPE ----------
async function auditTeam(storeId: string | null): Promise<AuditFinding[]> {
  if (!storeId) return [];
  const findings: AuditFinding[] = [];

  const { data } = await supabase
    .from("user_roles")
    .select("role,user_id")
    .eq("store_id", storeId);

  const roles: string[] = (data ?? []).map((r: any) => r.role);
  const has = (r: string) => roles.includes(r);

  if (!has("restaurant_admin")) {
    findings.push({
      id: "team-no-admin",
      category: "team",
      severity: "critical",
      label: "Restaurante sem gerente (restaurant_admin)",
      link: "/panel/team",
    });
  }
  if (!has("operator")) {
    findings.push({
      id: "team-no-cashier",
      category: "team",
      severity: "warning",
      label: "Sem operador/caixa cadastrado",
      link: "/panel/team",
    });
  }
  if (!has("kitchen")) {
    findings.push({
      id: "team-no-kitchen",
      category: "team",
      severity: "warning",
      label: "Sem usuário da cozinha cadastrado",
      link: "/panel/team",
    });
  }
  if (!has("delivery")) {
    findings.push({
      id: "team-no-delivery",
      category: "team",
      severity: "warning",
      label: "Sem entregador cadastrado na Equipe",
      panel: "restaurant",
      link: "/panel/team",
    });
  }
  if (!has("seller")) {
    findings.push({
      id: "team-no-seller",
      category: "team",
      severity: "suggestion",
      label: "Sem vendedor cadastrado",
      panel: "restaurant",
      link: "/panel/sellers",
    });
  }

  return findings;
}

// ---------- PAGAMENTOS ----------
async function auditPayments(storeId: string | null): Promise<AuditFinding[]> {
  if (!storeId) return [];
  const findings: AuditFinding[] = [];

  const { data: store } = await supabase
    .from("stores")
    .select(
      "stripe_connect_account_id,stripe_charges_enabled,stripe_onboarding_completed",
    )
    .eq("id", storeId)
    .maybeSingle();

  if (!store?.stripe_connect_account_id) {
    findings.push({
      id: "payments-no-stripe",
      category: "payments",
      severity: "warning",
      label: "Stripe Connect não configurado",
      panel: "admin",
      action: "Configure recebimentos para pagamentos com cartão.",
      link: "/admin/finance",
    });
  } else if (!store.stripe_charges_enabled || !store.stripe_onboarding_completed) {
    const intake = await fetchStorePayoutIntake(storeId);
    const awaitingReview = Boolean(intake?.submitted_at);
    findings.push({
      id: "payments-stripe-incomplete",
      category: "payments",
      severity: awaitingReview ? "warning" : "critical",
      label: awaitingReview
        ? "Recebimentos em análise"
        : "Recebimentos incompletos — cobranças desactivadas",
      detail: awaitingReview
        ? "Dados já enviados — pagamentos online ficam activos após aprovação."
        : "Falta completar os dados bancários do restaurante.",
      panel: "admin",
      action: awaitingReview
        ? "Admin → Recebimentos → acompanhar estado."
        : "Admin → Recebimentos → preencher dados ou enviar link WhatsApp.",
      link: "/admin/finance",
    });
  } else {
    findings.push({
      id: "payments-stripe-ok",
      category: "payments",
      severity: "ok",
      label: "Stripe Connect activo para cobranças",
      panel: "admin",
    });
  }

  return findings;
}

// ---------- MESAS ----------
async function auditTables(storeId: string | null): Promise<AuditFinding[]> {
  if (!storeId) return [];
  const findings: AuditFinding[] = [];

  const { data: tables } = await supabase
    .from("tables")
    .select("id,qr_token,is_active")
    .eq("store_id", storeId)
    .eq("is_active", true);

  const missingQr = (tables ?? []).filter((t: any) => !t.qr_token);
  if (missingQr.length > 0) {
    findings.push({
      id: "tables-missing-qr",
      category: "tables",
      severity: "warning",
      label: `${missingQr.length} mesa(s) sem código QR`,
      panel: "restaurant",
      action: "Regenerar QR em Mesas & QR.",
      link: "/panel/tables",
    });
  }

  return findings;
}

// ---------- IMPRESSÃO ----------
async function auditPrinting(storeId: string | null): Promise<AuditFinding[]> {
  if (!storeId) return [];
  const findings: AuditFinding[] = [];

  const { data: printers } = await supabase
    .from("printers")
    .select("id,is_active,name")
    .eq("store_id", storeId);

  if (!printers || printers.length === 0) {
    findings.push({
      id: "print-no-printer",
      category: "printing",
      severity: "warning",
      label: "Nenhuma impressora cadastrada",
      action: "Cadastre ao menos uma impressora.",
      link: "/admin/printer",
    });
  }

  // falhas recentes
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: jobs } = await supabase
    .from("print_jobs")
    .select("id,status")
    .eq("store_id", storeId)
    .gte("created_at", since);

  const failed = (jobs ?? []).filter((j: any) => j.status === "failed");
  if (failed.length > 0) {
    findings.push({
      id: "print-failed",
      category: "printing",
      severity: "warning",
      label: `${failed.length} falha(s) de impressão nas últimas 24h`,
      link: "/admin/printer",
    });
  }

  return findings;
}

export async function fetchAdminSystemAudit(storeId: string | null): Promise<AuditFinding[]> {
  const results = await Promise.allSettled([
    auditMenu(storeId),
    auditOrders(storeId),
    auditDelivery(storeId),
    auditTeam(storeId),
    auditPrinting(storeId),
    auditPayments(storeId),
    auditTables(storeId),
  ]);
  const out: AuditFinding[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") out.push(...r.value);
  }
  return out;
}
