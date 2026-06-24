import type { Database } from "@/integrations/supabase/types";
import type { StaffUiLang } from "@/components/StaffLanguageToggle";
import { panelT } from "@/lib/staffPanelLocale";
import type { StaffI18nKey } from "@/lib/staffI18n";

type DbAppRole = Database["public"]["Enums"]["app_role"];
export type StaffRole = DbAppRole | "manager" | "cashier" | "attendant" | "delivery";

export type AppArea = "admin" | "panel" | "seller" | "delivery";

const ALL_PANEL_SEGMENTS = new Set([
  "",
  "live",
  "kitchen",
  "dashboard",
  "cashier",
  "table-map",
  "tables",
  "finance",
  "settings",
  "my-profile",
  "team",
  "sellers",
  "guide",
  "diagnostics",
  "reviews",
]);

const MANAGER_PANEL_SEGMENTS = new Set([
  "",
  "live",
  "kitchen",
  "dashboard",
  "cashier",
  "table-map",
  "tables",
  "finance",
  "settings",
  "my-profile",
  "team",
  "sellers",
  "guide",
  "diagnostics",
  "reviews",
]);

/** Segmentos permitidos por perfil no painel do restaurante. */
const PANEL_SEGMENTS_BY_ROLE: Partial<Record<StaffRole, ReadonlySet<string>>> = {
  admin_master: ALL_PANEL_SEGMENTS,
  restaurant_admin: ALL_PANEL_SEGMENTS,
  manager: MANAGER_PANEL_SEGMENTS,
  operator: new Set(["", "live", "dashboard", "cashier", "table-map", "tables", "guide"]),
  kitchen: new Set(["", "live", "kitchen", "guide"]),
  cashier: new Set(["", "live", "cashier", "guide"]),
  attendant: new Set(["", "live", "dashboard", "cashier", "table-map", "tables", "guide"]),
  seller: new Set([]),
  delivery: new Set([]),
};

export function primaryAppAreaForRole(role: StaffRole | null | undefined): AppArea {
  if (!role) return "panel";
  if (role === "admin_master") return "admin";
  if (role === "seller") return "seller";
  if (role === "delivery") return "delivery";
  return "panel";
}

export function canAccessPanel(role: StaffRole | null | undefined): boolean {
  if (!role) return false;
  if (role === "delivery" || role === "seller") return false;
  return true;
}

export function canAccessDeliveryPanel(role: StaffRole | null | undefined): boolean {
  return role === "delivery" || role === "admin_master";
}

export function canAccessGeneralAdmin(role: StaffRole | null | undefined): boolean {
  return role === "admin_master";
}

export function canManageTeam(role: StaffRole | null | undefined): boolean {
  return role === "admin_master" || role === "restaurant_admin" || role === "manager";
}

export function canAssignDeliveryDriver(role: StaffRole | null | undefined): boolean {
  return (
    role === "admin_master" ||
    role === "restaurant_admin" ||
    role === "manager" ||
    role === "operator" ||
    role === "attendant"
  );
}

export function panelSegmentAllowed(role: StaffRole | null | undefined, segment: string): boolean {
  if (!role) return false;
  if (role === "admin_master") return true;
  const allowed = PANEL_SEGMENTS_BY_ROLE[role];
  if (!allowed) return false;
  return allowed.has(segment);
}

export type PanelNavItem = {
  key: string;
  segment: string;
  label: string;
  /** Rota absoluta opcional (ex.: relatórios no admin). */
  href?: string;
};

export type PanelNavGroup = {
  id: string;
  label: string;
  items: PanelNavItem[];
};

const PANEL_NAV_CATALOG: PanelNavGroup[] = [
  {
    id: "ops",
    label: "Operação",
    items: [
      { key: "live", segment: "live", label: "Pedidos ao vivo" },
      { key: "dashboard", segment: "dashboard", label: "Resumo" },
      { key: "cashier", segment: "cashier", label: "Caixa" },
      { key: "table-map", segment: "table-map", label: "Mapa de mesas" },
    ],
  },
  {
    id: "mgmt",
    label: "Gestão",
    items: [
      { key: "tables", segment: "tables", label: "Mesas & QR" },
      { key: "team", segment: "team", label: "Equipe" },
      { key: "sellers", segment: "sellers", label: "Vendedores" },
      { key: "reviews", segment: "reviews", label: "Avaliações" },
    ],
  },
  {
    id: "finance",
    label: "Financeiro",
    items: [{ key: "finance", segment: "finance", label: "Recebimentos" }],
  },
  {
    id: "config",
    label: "Configuração",
    items: [
      { key: "settings", segment: "settings", label: "Configurações" },
      { key: "my-profile", segment: "my-profile", label: "O meu perfil" },
      { key: "guide", segment: "guide", label: "Guia" },
    ],
  },
];

export function panelNavGroupsForRole(role: StaffRole | null | undefined): PanelNavGroup[] {
  return PANEL_NAV_CATALOG.map((group) => ({
    ...group,
    items: group.items.filter((item) => panelSegmentAllowed(role, item.segment)),
  })).filter((group) => group.items.length > 0);
}

/** @deprecated Use panelNavGroupsForRole */
export function panelNavItemsForRole(role: StaffRole | null | undefined) {
  return panelNavGroupsForRole(role).flatMap((g) => g.items);
}

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin_master: "Admin geral",
  restaurant_admin: "Dono do restaurante",
  manager: "Gerente",
  operator: "Operador",
  kitchen: "Cozinha",
  cashier: "Caixa",
  attendant: "Atendente",
  delivery: "Entregador",
  seller: "Vendedor",
};

const ROLE_I18N_KEYS: Record<StaffRole, StaffI18nKey> = {
  admin_master: "role.admin_master",
  restaurant_admin: "role.restaurant_admin",
  manager: "role.manager",
  operator: "role.operator",
  kitchen: "role.kitchen",
  cashier: "role.cashier",
  attendant: "role.attendant",
  delivery: "role.delivery",
  seller: "role.seller",
};

export function getStaffRoleLabel(role: StaffRole, lang?: StaffUiLang): string {
  return panelT(lang, ROLE_I18N_KEYS[role]);
}

export const RESTAURANT_STAFF_ROLES: StaffRole[] = [
  "restaurant_admin",
  "manager",
  "operator",
  "kitchen",
  "cashier",
  "attendant",
  "delivery",
];
