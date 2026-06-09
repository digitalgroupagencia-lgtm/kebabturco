/**
 * Dados de demonstração estáticos e determinísticos. Quando o modo demo
 * está ligado, o dashboard usa estes valores para que todos os gráficos
 * e listas apareçam preenchidos. Todos marcados conceptualmente como
 * `is_demo`. Nada disto é persistido.
 */

export const DEMO_STATS = {
  active_tenants: 24,
  total_tenants: 31,
  revenue_month: 184_320,
  mrr: 4_280,
  orders_today: 412,
  revenue_today: 8_640,
  paid_count: 27,
  pending_count: 3,
  overdue_count: 1,
};

const MONTH_LABELS = ["Jul", "Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];

export const DEMO_REVENUE_SERIES = MONTH_LABELS.map((label, i) => ({
  month_label: label,
  revenue: Math.round(72_000 + i * 9_400 + Math.sin(i / 1.5) * 7_500),
}));

export const DEMO_TOP_TENANTS = [
  { tenant_id: "demo-1", tenant_name: "Kebab Turco — Gandía", total_revenue: 42_180, orders_count: 1_240 },
  { tenant_id: "demo-2", tenant_name: "Kebab Turco — Playa Gandía", total_revenue: 31_640, orders_count: 980 },
  { tenant_id: "demo-3", tenant_name: "Pizzería La Nonna", total_revenue: 27_310, orders_count: 812 },
  { tenant_id: "demo-4", tenant_name: "Sushi Sora", total_revenue: 22_960, orders_count: 604 },
  { tenant_id: "demo-5", tenant_name: "Burger Lab", total_revenue: 18_440, orders_count: 712 },
];

/** Cor mapeada via token: cada série usa um token semântico ou paleta de chart. */
export const DEMO_PAYMENT_METHODS = [
  { name: "Cartão", value: 48, amount: 88_473, token: "primary" as const },
  { name: "Online", value: 22, amount: 40_550, token: "info" as const },
  { name: "Dinheiro", value: 18, amount: 33_178, token: "success" as const },
  { name: "Bizum", value: 8, amount: 14_746, token: "warning" as const },
  { name: "Outros", value: 4, amount: 7_373, token: "purple" as const },
];

export const DEMO_SALES_CHANNELS = [
  { name: "Salão", value: 38, amount: 70_042, token: "primary" as const },
  { name: "Delivery", value: 27, amount: 49_766, token: "info" as const },
  { name: "Take Away", value: 18, amount: 33_178, token: "success" as const },
  { name: "QR / Mesa", value: 11, amount: 20_275, token: "warning" as const },
  { name: "App", value: 6, amount: 11_059, token: "purple" as const },
];

export const DEMO_FUNNEL = [
  { name: "Leads", value: 320, token: "primary" as const },
  { name: "Teste grátis", value: 184, token: "warning" as const },
  { name: "Implantação", value: 96, token: "accent" as const },
  { name: "Activos", value: 71, token: "info" as const },
  { name: "Cancelados", value: 12, token: "muted" as const },
];

export const DEMO_RECENT_ACTIVITY = [
  { id: "demo-a1", title: "Pedido #1042 · Kebab Turco — Gandía", detail: "23,40 €", time: "há 2 min", tone: "success" as const },
  { id: "demo-a2", title: "Pedido #1041 · Sushi Sora", detail: "41,80 €", time: "há 8 min", tone: "success" as const },
  { id: "demo-a3", title: "Vencimento · Pizzería La Nonna", detail: "89 €", time: "amanhã", tone: "muted" as const },
  { id: "demo-a4", title: "Cliente activo · Burger Lab", detail: "Plano Pro", time: "há 1d", tone: "default" as const },
];

/** Cor real (HSL CSS var) para cada token de paleta de chart. */
export const CHART_TOKEN_HSL: Record<string, string> = {
  primary: "hsl(var(--primary))",
  info: "hsl(217 91% 60%)",
  success: "hsl(var(--success))",
  warning: "hsl(38 92% 50%)",
  accent: "hsl(var(--accent))",
  purple: "hsl(262 83% 58%)",
  muted: "hsl(var(--muted-foreground))",
};

/* =====================================================================
 * Demo data — Painel do Restaurante (uma única loja).
 * Usado quando useDemoMode() === true para preencher Dashboard, Mesas,
 * Mapa, Equipa, Caixa e Operação ao vivo com exemplos coerentes.
 * Nada é gravado em base de dados — tudo cosmético / visual.
 * ===================================================================== */

export const DEMO_PANEL_DASHBOARD = {
  ordersToday: 47,
  ordersMonth: 1284,
  totalToday: 1842.5,
  totalMonth: 54_320.8,
  avgTicket: 39.2,
  cancelledToday: 2,
  pending: 4,
  preparing: 6,
  ready: 3,
  delivered: 32,
};

export const DEMO_PANEL_TEAM = [
  { id: "demo-t1", full_name: "Ana Silva", email: "ana@demo.local", role: "restaurant_admin", preferred_language: "pt" },
  { id: "demo-t2", full_name: "Marco Pereira", email: "marco@demo.local", role: "manager", preferred_language: "pt" },
  { id: "demo-t3", full_name: "Lucía Ramos", email: "lucia@demo.local", role: "operator", preferred_language: "es" },
  { id: "demo-t4", full_name: "João Costa", email: "joao@demo.local", role: "kitchen", preferred_language: "pt" },
  { id: "demo-t5", full_name: "Sara Mendes", email: "sara@demo.local", role: "cashier", preferred_language: "pt" },
  { id: "demo-t6", full_name: "Diego López", email: "diego@demo.local", role: "delivery", preferred_language: "es" },
];

export const DEMO_PANEL_TABLES = Array.from({ length: 12 }).map((_, i) => ({
  id: `demo-tbl-${i + 1}`,
  number: String(i + 1),
  capacity: i % 3 === 0 ? 2 : i % 4 === 0 ? 6 : 4,
  is_active: true,
  qr_token: `demo-token-${i + 1}`,
}));

export const DEMO_PANEL_TABLE_STATES: Record<string, { state: "free" | "pending" | "preparing" | "open_account" | "payment_pending" | "waiting_order"; total?: number }> = {
  "1": { state: "open_account", total: 38.5 },
  "2": { state: "pending", total: 22 },
  "3": { state: "free" },
  "4": { state: "preparing", total: 54.9 },
  "5": { state: "free" },
  "6": { state: "payment_pending", total: 71.4 },
  "7": { state: "waiting_order" },
  "8": { state: "free" },
  "9": { state: "open_account", total: 19.8 },
  "10": { state: "preparing", total: 46.2 },
  "11": { state: "free" },
  "12": { state: "free" },
};

export const DEMO_PANEL_CASHIER = {
  total: 1_842.5,
  card: 1_021.3,
  cash: 524.1,
  pix: 297.1,
  count: 47,
  pendingOrders: [
    { id: "demo-o1", order_number: "1042", customer_name: "Mesa 2", total: 22, payment_method: null, created_at: new Date(Date.now() - 5 * 60_000).toISOString(), status: "pending" },
    { id: "demo-o2", order_number: "1043", customer_name: "Balcão", total: 14.5, payment_method: null, created_at: new Date(Date.now() - 11 * 60_000).toISOString(), status: "pending" },
    { id: "demo-o3", order_number: "1044", customer_name: "Delivery — Diego", total: 38.9, payment_method: null, created_at: new Date(Date.now() - 18 * 60_000).toISOString(), status: "preparing" },
  ],
};

export const DEMO_PANEL_LIVE_ORDERS = [
  { id: "demo-l1", order_number: "1045", customer_name: "Mesa 4", order_type: "dine_in", status: "pending", total: 28.5, created_at: new Date(Date.now() - 2 * 60_000).toISOString(), items_summary: "2× Kebab, 1× Coca-Cola" },
  { id: "demo-l2", order_number: "1046", customer_name: "Balcão", order_type: "takeaway", status: "preparing", total: 14.5, created_at: new Date(Date.now() - 6 * 60_000).toISOString(), items_summary: "1× Hambúrguer, 1× Batatas" },
  { id: "demo-l3", order_number: "1047", customer_name: "Lucía R.", order_type: "delivery", status: "preparing", total: 38.9, created_at: new Date(Date.now() - 12 * 60_000).toISOString(), items_summary: "Menu família" },
  { id: "demo-l4", order_number: "1048", customer_name: "Mesa 1", order_type: "dine_in", status: "ready", total: 19.8, created_at: new Date(Date.now() - 15 * 60_000).toISOString(), items_summary: "1× Pizza Margherita" },
  { id: "demo-l5", order_number: "1049", customer_name: "Carlos M.", order_type: "delivery", status: "ready", total: 24.5, created_at: new Date(Date.now() - 22 * 60_000).toISOString(), items_summary: "2× Salada, 1× Sumo" },
];