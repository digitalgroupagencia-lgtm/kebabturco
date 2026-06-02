import type { StaffUiLang } from "@/components/StaffLanguageToggle";

/**
 * Dicionário de tradução do painel interno (staff).
 * Chaves agrupadas por contexto. Adicione novas chaves conforme as páginas
 * forem refactoradas para remover strings hardcoded.
 */
export const STAFF_I18N = {
  // --- Comum ---
  "common.save": { es: "Guardar", pt: "Salvar", en: "Save" },
  "common.cancel": { es: "Cancelar", pt: "Cancelar", en: "Cancel" },
  "common.delete": { es: "Eliminar", pt: "Remover", en: "Delete" },
  "common.edit": { es: "Editar", pt: "Editar", en: "Edit" },
  "common.create": { es: "Crear", pt: "Criar", en: "Create" },
  "common.confirm": { es: "Confirmar", pt: "Confirmar", en: "Confirm" },
  "common.close": { es: "Cerrar", pt: "Fechar", en: "Close" },
  "common.loading": { es: "Cargando…", pt: "A carregar…", en: "Loading…" },
  "common.search": { es: "Buscar", pt: "Procurar", en: "Search" },
  "common.back": { es: "Volver", pt: "Voltar", en: "Back" },
  "common.signout": { es: "Salir", pt: "Sair", en: "Sign out" },
  "common.yes": { es: "Sí", pt: "Sim", en: "Yes" },
  "common.no": { es: "No", pt: "Não", en: "No" },
  "common.active": { es: "Activo", pt: "Activo", en: "Active" },
  "common.inactive": { es: "Inactivo", pt: "Inactivo", en: "Inactive" },
  "common.actions": { es: "Acciones", pt: "Acções", en: "Actions" },
  "common.empty": { es: "Sin datos", pt: "Sem dados", en: "No data" },

  // --- Sidebar groups ---
  "nav.group.ops": { es: "Operación", pt: "Operação", en: "Operations" },
  "nav.group.mgmt": { es: "Gestión", pt: "Gestão", en: "Management" },
  "nav.group.finance": { es: "Financiero", pt: "Financeiro", en: "Finance" },
  "nav.group.config": { es: "Configuración", pt: "Configuração", en: "Settings" },

  // --- Sidebar items ---
  "nav.live": { es: "Pedidos en vivo", pt: "Pedidos ao vivo", en: "Live orders" },
  "nav.dashboard": { es: "Resumen", pt: "Resumo", en: "Overview" },
  "nav.cashier": { es: "Caja", pt: "Caixa", en: "Cashier" },
  "nav.table-map": { es: "Mapa de mesas", pt: "Mapa de mesas", en: "Table map" },
  "nav.tables": { es: "Mesas & QR", pt: "Mesas & QR", en: "Tables & QR" },
  "nav.team": { es: "Equipo", pt: "Equipa", en: "Team" },
  "nav.sellers": { es: "Vendedores", pt: "Vendedores", en: "Sellers" },
  "nav.finance": { es: "Recibos", pt: "Recebimentos", en: "Payouts" },
  "nav.settings": { es: "Configuración", pt: "Configurações", en: "Settings" },
  "nav.guide": { es: "Guía", pt: "Guia", en: "Guide" },
  "nav.diagnostics": { es: "Diagnóstico", pt: "Diagnóstico", en: "Diagnostics" },
  "nav.kitchen": { es: "Cocina", pt: "Cozinha", en: "Kitchen" },

  // --- Páginas ---
  "page.live.title": { es: "Operación en vivo", pt: "Operação ao vivo", en: "Live operations" },
  "page.dashboard.title": { es: "Resumen del día", pt: "Resumo do dia", en: "Today's overview" },
  "page.settings.title": { es: "Configuración", pt: "Configurações", en: "Settings" },
  "page.settings.subtitle": {
    es: "Ajuste la operación de su tienda.",
    pt: "Ajuste a operação da sua loja.",
    en: "Tune your store operation.",
  },
  "page.team.title": { es: "Equipo", pt: "Equipa", en: "Team" },
  "page.sellers.title": { es: "Vendedores", pt: "Vendedores", en: "Sellers" },
  "page.sellers.subtitle": {
    es: "Empleados que toman pedidos por móvil vinculando mesa y cliente.",
    pt: "Funcionários que tiram pedidos pelo celular vinculando mesa e cliente.",
    en: "Staff who take orders on mobile, linking table and customer.",
  },
  "page.sellers.new": { es: "Nuevo vendedor", pt: "Novo vendedor", en: "New seller" },
  "page.sellers.disabled.title": {
    es: "Módulo Vendedor desactivado",
    pt: "Módulo Vendedor desactivado",
    en: "Seller module disabled",
  },
  "page.sellers.disabled.body": {
    es: "Este módulo lo controla la plataforma. Contacte al administrador para activarlo en su restaurante.",
    pt: "Este módulo é controlado pela plataforma. Contacte o administrador para o activar no seu restaurante.",
    en: "This module is controlled by the platform. Contact the administrator to enable it for your restaurant.",
  },
  "page.tables.title": { es: "Mesas & QR", pt: "Mesas & QR", en: "Tables & QR" },
  "page.finance.title": { es: "Recibos", pt: "Recebimentos", en: "Payouts" },

  // --- Settings tabs ---
  "settings.tab.store": { es: "Tienda", pt: "Loja", en: "Store" },
  "settings.tab.ops": { es: "Operación", pt: "Operação", en: "Operations" },
  "settings.tab.receipt": { es: "Recibo", pt: "Recibo", en: "Receipt" },
  "settings.tab.notif": { es: "Notificaciones", pt: "Notificações", en: "Notifications" },
  "settings.tab.hours": { es: "Horario", pt: "Horário", en: "Hours" },
} as const satisfies Record<string, Record<StaffUiLang, string>>;

export type StaffI18nKey = keyof typeof STAFF_I18N;

export function staffT(lang: StaffUiLang, key: StaffI18nKey, fallback?: string): string {
  const entry = STAFF_I18N[key];
  if (!entry) return fallback ?? key;
  return entry[lang] ?? entry.es ?? fallback ?? key;
}
