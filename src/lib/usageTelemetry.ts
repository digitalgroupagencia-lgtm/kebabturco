// Telemetria local (sem servidor) para o Assistente IA responder
// "que tela nunca foi aberta?", "que módulo está abandonado?", etc.
// Guardado em localStorage por utilizador/dispositivo.

const KEY = "wgm.usage.v1";
const FIRST_SEEN_KEY = "wgm.usage.firstSeen";

export type RouteUsage = {
  path: string;
  count: number;
  firstVisit: string;
  lastVisit: string;
};

export type UsageSnapshot = {
  firstSeen: string;
  totalVisits: number;
  routes: RouteUsage[];
  /** Telas conhecidas que NUNCA foram visitadas neste dispositivo. */
  neverVisited: string[];
};

/** Catálogo de telas relevantes (admin + painel). Usado para detectar abandono. */
export const KNOWN_ROUTES: { path: string; label: string; area: "admin" | "panel" }[] = [
  // Admin Master
  { path: "/admin", label: "Dashboard Admin", area: "admin" },
  { path: "/admin/tenants", label: "Restaurantes (clientes)", area: "admin" },
  { path: "/admin/plans", label: "Planos", area: "admin" },
  { path: "/admin/payments", label: "Pagamentos (gateways)", area: "admin" },
  { path: "/admin/banner", label: "Banners e mídia", area: "admin" },
  { path: "/admin/template-version", label: "Versão do template", area: "admin" },
  { path: "/admin/order-simulator", label: "Simulador de pedido", area: "admin" },
  { path: "/admin/printer", label: "Impressoras", area: "admin" },
  { path: "/admin/monitoring", label: "Monitoramento financeiro", area: "admin" },
  { path: "/admin/diagnostics", label: "Diagnósticos (hub)", area: "admin" },
  { path: "/admin/push-test", label: "Teste de push", area: "admin" },
  { path: "/admin/centrals-hub", label: "Centrais (IA/Push/Loyalty)", area: "admin" },
  { path: "/admin/ai-conversations", label: "Conversas IA", area: "admin" },
  { path: "/admin/guide", label: "Central de ajuda", area: "admin" },
  { path: "/admin/settings", label: "Configurações globais", area: "admin" },
  // Painel restaurante
  { path: "/panel", label: "Operação ao vivo", area: "panel" },
  { path: "/panel/menu", label: "Cardápio", area: "panel" },
  { path: "/panel/modifier-groups", label: "Personalizações", area: "panel" },
  { path: "/panel/cashier", label: "Caixa", area: "panel" },
  { path: "/panel/kds", label: "Cozinha (KDS)", area: "panel" },
  { path: "/panel/orders", label: "Histórico de pedidos", area: "panel" },
  { path: "/panel/tables", label: "Mesas", area: "panel" },
  { path: "/panel/table-map", label: "Mapa de mesas", area: "panel" },
  { path: "/panel/sellers", label: "Vendedores", area: "panel" },
  { path: "/panel/coupons", label: "Cupons", area: "panel" },
  { path: "/panel/loyalty", label: "Fidelidade", area: "panel" },
  { path: "/panel/stock", label: "Estoque", area: "panel" },
  { path: "/panel/reports", label: "Relatórios", area: "panel" },
  { path: "/panel/finance", label: "Financeiro", area: "panel" },
  { path: "/panel/payments", label: "Métodos de pagamento", area: "panel" },
  { path: "/panel/team", label: "Equipe", area: "panel" },
  { path: "/panel/totem-config", label: "Configuração do totem", area: "panel" },
  { path: "/panel/diagnostics", label: "Auditoria interna", area: "panel" },
  { path: "/panel/settings", label: "Configurações", area: "panel" },
  { path: "/panel/guide", label: "Central de ajuda", area: "panel" },
];

function load(): Record<string, RouteUsage> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(map: Record<string, RouteUsage>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota etc. */
  }
}

function normalizePath(path: string): string {
  // Normaliza /admin/tenants/abc-123 -> /admin/tenants/:id, etc.
  return path
    .replace(/\/[0-9a-f-]{20,}/gi, "/:id")
    .replace(/\/\d+/g, "/:n")
    .replace(/\?.*$/, "");
}

/** Regista uma visita a uma rota (chamado pelo hook usePageTelemetry). */
export function trackVisit(path: string) {
  const p = normalizePath(path);
  if (!p) return;
  const map = load();
  const now = new Date().toISOString();
  const prev = map[p];
  map[p] = {
    path: p,
    count: (prev?.count ?? 0) + 1,
    firstVisit: prev?.firstVisit ?? now,
    lastVisit: now,
  };
  save(map);
  try {
    if (!localStorage.getItem(FIRST_SEEN_KEY)) {
      localStorage.setItem(FIRST_SEEN_KEY, now);
    }
  } catch {}
}

export function getUsageSnapshot(): UsageSnapshot {
  const map = load();
  const routes = Object.values(map).sort((a, b) => b.count - a.count);
  const visitedSet = new Set(routes.map((r) => r.path));
  const neverVisited = KNOWN_ROUTES.filter((k) => !visitedSet.has(k.path)).map(
    (k) => `${k.path} (${k.label})`,
  );
  const totalVisits = routes.reduce((s, r) => s + r.count, 0);
  let firstSeen = "";
  try {
    firstSeen = localStorage.getItem(FIRST_SEEN_KEY) ?? "";
  } catch {}
  return { firstSeen, totalVisits, routes, neverVisited };
}

/** Serialização curta para injetar como contexto no chat da IA. */
export function getUsageSnapshotForPrompt(): string {
  const s = getUsageSnapshot();
  if (s.routes.length === 0) {
    return "TELEMETRIA LOCAL: nenhuma visita registada neste dispositivo ainda.";
  }
  const top = s.routes.slice(0, 10).map((r) => `${r.path}=${r.count}`).join(", ");
  const cold = s.neverVisited.slice(0, 20).join("; ");
  return [
    `TELEMETRIA LOCAL (apenas este dispositivo/utilizador, sem servidor):`,
    `- Desde: ${s.firstSeen || "agora"}`,
    `- Total de visitas: ${s.totalVisits}`,
    `- Top rotas: ${top}`,
    `- Telas conhecidas NUNCA abertas neste dispositivo (${s.neverVisited.length}): ${cold || "—"}`,
    `Aviso: estes dados são apenas do navegador actual. Não são consolidados no servidor.`,
  ].join("\n");
}

export function clearUsage() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(FIRST_SEEN_KEY);
  } catch {}
}
