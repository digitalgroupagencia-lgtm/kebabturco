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
    title: "Painel restaurante",
    description: "Operação diária — pedidos, cardápio, caixa, etc.",
    routes: [
      {
        id: "panel-home",
        label: "Pedidos (início)",
        description: "Painel principal do restaurante.",
        role: "Painel",
        kind: "real",
        href: nav.panel,
      },
      {
        id: "panel-menu",
        label: "Cardápio",
        description: "Produtos e categorias.",
        role: "Painel",
        kind: "real",
        href: () => nav.panel("menu"),
      },
      {
        id: "panel-cashier",
        label: "Caixa",
        description: "POS / caixa.",
        role: "Painel",
        kind: "real",
        href: () => nav.panel("cashier"),
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
    title: "Administração avançada",
    description: "Planos, centrais, definições globais — só administrador geral.",
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
