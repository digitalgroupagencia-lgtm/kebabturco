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