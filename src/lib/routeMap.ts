import { nav, LOVABLE_PREVIEW_PATHS } from "@/lib/navPaths.ts";

export type RouteKind = "real" | "query";

export type RouteMapEntry = {
  id: string;
  label: string;
  description: string;
  role: string;
  kind: RouteKind;
  /** Caminho calculado em runtime — não string literal longa no fonte. */
  href: () => string;
  note?: string;
};

export type RouteMapSection = {
  id: string;
  title: string;
  description: string;
  routes: RouteMapEntry[];
};

export const LOVABLE_WILDCARD_HINT = "lovable-wildcard";

export const ROUTE_MAP_SECTIONS: RouteMapSection[] = [
  {
    id: "store",
    title: "Loja pública Kebab Turco",
    description: "Totem / pedidos online — visitantes sem login.",
    routes: [
      {
        id: "store-home",
        label: "Loja (início)",
        description: "Splash → idioma → tipo de pedido → cardápio.",
        role: "Público",
        kind: "real",
        href: nav.home,
      },
    ],
  },
  {
    id: "auth",
    title: "Login",
    description: "Entrada única para todos os perfis.",
    routes: [
      {
        id: "auth-login",
        label: "Login",
        description: "Após login: admin → administração; restaurante → painel; vendedor → área vendedor.",
        role: "Qualquer utilizador registado",
        kind: "real",
        href: nav.auth,
      },
    ],
  },
  {
    id: "panel",
    title: "Painel operacional",
    description: "Operação diária do restaurante — sem configuração da loja.",
    routes: [
      {
        id: "panel-home",
        label: "Pedidos",
        description: "Painel principal do restaurante.",
        role: "restaurant_admin, operator, kitchen",
        kind: "real",
        href: nav.panel,
      },
      {
        id: "panel-dashboard",
        label: "Resumo",
        description: "Dashboard operacional.",
        role: "restaurant_admin, operator, kitchen",
        kind: "real",
        href: () => nav.panel("dashboard"),
      },
      {
        id: "panel-cashier",
        label: "Caixa",
        description: "POS / caixa.",
        role: "restaurant_admin, operator, kitchen",
        kind: "real",
        href: () => nav.panel("cashier"),
      },
      {
        id: "panel-tables",
        label: "Mesas & QR",
        description: "Mesas e códigos QR.",
        role: "restaurant_admin, operator",
        kind: "real",
        href: () => nav.panel("tables"),
      },
      {
        id: "panel-team",
        label: "Equipe",
        description: "Membros da equipa.",
        role: "restaurant_admin",
        kind: "real",
        href: () => nav.panel("team"),
      },
      {
        id: "panel-cashier-shortcut",
        label: "Atalho caixa",
        description: "Redirecciona para a caixa no painel.",
        role: "Painel",
        kind: "real",
        href: nav.cashier,
      },
    ],
  },
  {
    id: "admin",
    title: "Administração do projecto",
    description: "Configuração completa — só administrador geral (admin_master).",
    routes: [
      {
        id: "admin-home",
        label: "Command Center",
        description: "Dashboard de administração geral.",
        role: "admin_master",
        kind: "real",
        href: nav.admin,
      },
      {
        id: "admin-menu",
        label: "Cardápio",
        description: "Produtos, categorias e preços.",
        role: "admin_master",
        kind: "real",
        href: () => nav.admin("menu"),
      },
      {
        id: "admin-branding",
        label: "Identidade visual",
        description: "Cores, logo e tema.",
        role: "admin_master",
        kind: "real",
        href: () => nav.admin("branding"),
      },
      {
        id: "admin-operations",
        label: "Pagamentos",
        description: "Métodos e operações de pagamento.",
        role: "admin_master",
        kind: "real",
        href: () => nav.admin("operations"),
      },
      {
        id: "admin-routes",
        label: "Mapa de rotas",
        description: "Diagnóstico de endereços (esta página).",
        role: "admin_master",
        kind: "real",
        href: () => nav.admin("routes"),
      },
      {
        id: "admin-plans",
        label: "Planos & funcionalidades",
        description: "START / PRO / PREMIUM, IA, benefícios.",
        role: "admin_master",
        kind: "real",
        href: () => nav.admin("plans"),
      },
    ],
  },
  {
    id: "seller",
    title: "Vendedor",
    description: "App mobile do garçom / vendedor.",
    routes: [
      {
        id: "seller-home",
        label: "Início vendedor",
        description: "Home do vendedor.",
        role: "seller",
        kind: "real",
        href: nav.seller,
      },
    ],
  },
];

/** Lista curada igual ao selector Lovable desejado. */
export { LOVABLE_PREVIEW_PATHS };

export function buildRouteOpenUrl(href: string): string {
  if (typeof window === "undefined") return href;
  return `${window.location.origin}${href}`;
}
