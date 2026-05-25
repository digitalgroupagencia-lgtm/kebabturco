export type RouteKind = "real" | "wildcard" | "query" | "legacy";

export type RouteMapEntry = {
  path: string;
  label: string;
  description: string;
  role: string;
  active: boolean;
  kind: RouteKind;
  note?: string;
};

export type RouteMapSection = {
  id: string;
  title: string;
  description: string;
  routes: RouteMapEntry[];
};

/** Query quando o preview Lovable abriu um wildcard literal (/admin/*). */
export const LOVABLE_WILDCARD_HINT = "lovable-wildcard";

export const ROUTE_MAP_SECTIONS: RouteMapSection[] = [
  {
    id: "store",
    title: "Loja pública Kebab Turco",
    description: "Totem / pedidos online — visitantes sem login.",
    routes: [
      {
        path: "/",
        label: "Loja (início)",
        description: "Splash → idioma → tipo de pedido → cardápio.",
        role: "Público",
        active: true,
        kind: "real",
      },
      {
        path: "/?preview=1&tenant=kebab-turco&screen=home",
        label: "Cardápio directo",
        description: "Salta para o ecrã home no preview.",
        role: "Público",
        active: true,
        kind: "query",
        note: "Ecrã interno — não é rota URL separada.",
      },
      {
        path: "/?preview=1&tenant=kebab-turco&screen=product&productId=ID",
        label: "Produto directo",
        description: "Abre ecrã de produto; substituir ID por UUID real.",
        role: "Público",
        active: true,
        kind: "query",
      },
      {
        path: "/?preview=1&tenant=kebab-turco&screen=payment&seedCheckout=1",
        label: "Checkout directo",
        description: "Pagamento com item demo no carrinho.",
        role: "Público",
        active: true,
        kind: "query",
      },
    ],
  },
  {
    id: "auth",
    title: "Login",
    description: "Entrada única para todos os perfis.",
    routes: [
      {
        path: "/auth",
        label: "Login",
        description: "Após login: admin geral → /admin; restaurante → /panel; vendedor → /seller.",
        role: "Qualquer utilizador registado",
        active: true,
        kind: "real",
      },
    ],
  },
  {
    id: "panel",
    title: "Painel restaurante",
    description: "Operação diária — pedidos, cardápio, caixa, etc.",
    routes: [
      {
        path: "/panel",
        label: "Pedidos (início)",
        description: "Painel principal do restaurante.",
        role: "restaurant_admin, operator, kitchen…",
        active: true,
        kind: "real",
      },
      { path: "/panel/menu", label: "Cardápio", description: "Produtos e categorias.", role: "Painel", active: true, kind: "real" },
      { path: "/panel/modifiers", label: "Personalização", description: "Grupos de modificadores.", role: "Painel", active: true, kind: "real" },
      { path: "/panel/banners", label: "Banners", description: "Banners da loja.", role: "Painel", active: true, kind: "real" },
      { path: "/panel/delivery-zones", label: "Zonas de entrega", description: "Zonas e taxas.", role: "Painel", active: true, kind: "real" },
      { path: "/panel/payments", label: "Pagamentos", description: "Métodos de pagamento.", role: "Painel", active: true, kind: "real" },
      { path: "/panel/printers", label: "Impressoras", description: "Configuração de impressão.", role: "Painel", active: true, kind: "real" },
      { path: "/panel/cashier", label: "Caixa", description: "POS / caixa.", role: "Painel", active: true, kind: "real" },
      { path: "/panel/branding", label: "Identidade", description: "Logo e cores.", role: "Painel", active: true, kind: "real" },
      { path: "/panel/settings", label: "Configurações", description: "Definições do painel.", role: "Painel", active: true, kind: "real" },
      { path: "/cashier", label: "Atalho caixa", description: "Redirecciona para /panel/cashier.", role: "Painel", active: true, kind: "real" },
    ],
  },
  {
    id: "admin",
    title: "Administração avançada",
    description: "Planos, centrais, definições globais — só administrador geral.",
    routes: [
      {
        path: "/admin",
        label: "Command Center",
        description: "Dashboard de administração geral.",
        role: "admin_master",
        active: true,
        kind: "real",
      },
      { path: "/admin/routes", label: "Mapa de rotas", description: "Diagnóstico de endereços (esta página).", role: "admin_master", active: true, kind: "real" },
      { path: "/admin/plans", label: "Planos & funcionalidades", description: "START / PRO / PREMIUM, IA, benefícios.", role: "admin_master", active: true, kind: "real" },
      { path: "/admin/branding", label: "Identidade visual", description: "Marca do projecto.", role: "admin_master", active: true, kind: "real" },
      { path: "/admin/banner", label: "Banners", description: "Banners globais.", role: "admin_master", active: true, kind: "real" },
      { path: "/admin/operations", label: "Operações", description: "Pagamentos e operação.", role: "admin_master", active: true, kind: "real" },
      { path: "/admin/printer", label: "Impressora", description: "Impressão.", role: "admin_master", active: true, kind: "real" },
      { path: "/admin/centrals", label: "Hub centrais", description: "Centrais operacionais.", role: "admin_master", active: true, kind: "real" },
      { path: "/admin/centrals/ai", label: "Central IA", description: "Módulos de inteligência artificial.", role: "admin_master", active: true, kind: "real" },
      { path: "/admin/users", label: "Utilizadores", description: "Gestão de contas.", role: "admin_master", active: true, kind: "real" },
      { path: "/admin/settings", label: "Definições", description: "Configurações globais.", role: "admin_master", active: true, kind: "real" },
    ],
  },
  {
    id: "seller",
    title: "Vendedor",
    description: "App mobile do garçom / vendedor.",
    routes: [
      { path: "/seller", label: "Início vendedor", description: "Home do vendedor.", role: "seller", active: true, kind: "real" },
      { path: "/seller/tables", label: "Mesas", description: "Lista de mesas.", role: "seller", active: true, kind: "real" },
      { path: "/seller/new", label: "Novo pedido", description: "Criar pedido.", role: "seller", active: true, kind: "real" },
    ],
  },
];

/** Separa pathname e search de uma entrada do mapa. */
export function splitRoutePath(path: string): { pathname: string; search: string } {
  const q = path.indexOf("?");
  if (q === -1) return { pathname: path, search: "" };
  return { pathname: path.slice(0, q), search: path.slice(q) };
}

export function buildRouteOpenUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const { pathname, search } = splitRoutePath(path);
  return `${window.location.origin}${pathname}${search}`;
}
