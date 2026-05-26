import type { Database } from "@/integrations/supabase/types";

export type StaffRole = Database["public"]["Enums"]["app_role"];

export type AppArea = "admin" | "panel" | "seller" | "delivery";

const ALL_PANEL_SEGMENTS = new Set([
  "",
  "dashboard",
  "cashier",
  "table-map",
  "tables",
  "finance",
  "settings",
  "menu",
  "team",
  "sellers",
  "guide",
  "diagnostics",
]);

/** Segmentos permitidos por perfil no painel do restaurante. */
const PANEL_SEGMENTS_BY_ROLE: Partial<Record<StaffRole, ReadonlySet<string>>> = {
  admin_master: ALL_PANEL_SEGMENTS,
  restaurant_admin: ALL_PANEL_SEGMENTS,
  manager: ALL_PANEL_SEGMENTS,
  operator: new Set(["", "dashboard", "cashier", "table-map", "tables", "guide"]),
  kitchen: new Set(["", "guide"]),
  cashier: new Set(["", "cashier", "guide"]),
  attendant: new Set(["", "dashboard", "cashier", "table-map", "tables", "guide"]),
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

export function panelNavItemsForRole(role: StaffRole | null | undefined) {
  const all = [
    { key: "orders", segment: "", label: "Pedidos" },
    { key: "dashboard", segment: "dashboard", label: "Resumo" },
    { key: "cashier", segment: "cashier", label: "Caixa" },
    { key: "finance", segment: "finance", label: "Recebimentos" },
    { key: "menu", segment: "menu", label: "Cardápio" },
    { key: "table-map", segment: "table-map", label: "Mapa de mesas" },
    { key: "tables", segment: "tables", label: "Mesas & QR" },
    { key: "settings", segment: "settings", label: "Configurações" },
    { key: "team", segment: "team", label: "Equipe" },
    { key: "sellers", segment: "sellers", label: "Vendedores" },
    { key: "guide", segment: "guide", label: "Guia" },
    { key: "diagnostics", segment: "diagnostics", label: "Diagnóstico" },
  ] as const;

  return all.filter((item) => panelSegmentAllowed(role, item.segment));
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

export const RESTAURANT_STAFF_ROLES: StaffRole[] = [
  "restaurant_admin",
  "manager",
  "operator",
  "kitchen",
  "cashier",
  "attendant",
  "delivery",
];
