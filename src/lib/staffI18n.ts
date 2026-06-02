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
  "common.refresh": { es: "Actualizar", pt: "Actualizar", en: "Refresh" },
  "common.customer": { es: "Cliente", pt: "Cliente", en: "Customer" },
  "common.error": { es: "Error", pt: "Erro", en: "Error" },
  "common.success": { es: "Hecho", pt: "Feito", en: "Done" },
  "common.no_store": { es: "Ninguna tienda vinculada.", pt: "Nenhuma loja vinculada.", en: "No store linked." },

  // --- Order modality (reutilizável em várias páginas) ---
  "order.modality.delivery": { es: "Entrega", pt: "Entrega", en: "Delivery" },
  "order.modality.pickup": { es: "Mostrador", pt: "Balcão", en: "Counter" },
  "order.modality.table": { es: "Mesa", pt: "Mesa", en: "Table" },

  // --- Toasts genéricos ---
  "toast.saved": { es: "Guardado", pt: "Guardado", en: "Saved" },
  "toast.save_error": { es: "Error al guardar", pt: "Erro ao guardar", en: "Save failed" },
  "toast.payment_registered": { es: "Pago registrado", pt: "Pagamento registado", en: "Payment registered" },
  "toast.payment_error": { es: "Error al registrar pago", pt: "Erro ao registar pagamento", en: "Payment failed" },
  "toast.cash_open_error": { es: "Error al abrir caja", pt: "Erro ao abrir caixa", en: "Failed to open register" },
  "toast.cash_close_error": { es: "Error al cerrar caja", pt: "Erro ao fechar caixa", en: "Failed to close register" },
  "toast.cash_opened": { es: "¡Caja abierta!", pt: "Caixa aberta!", en: "Register opened!" },
  "toast.cash_closed": { es: "¡Caja cerrada!", pt: "Caixa fechada!", en: "Register closed!" },

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

  // --- KDS (cozinha) ---
  "kds.title": { es: "KDS — Cocina", pt: "KDS — Cozinha", en: "KDS — Kitchen" },
  "kds.col.new": { es: "Nuevos", pt: "Novos", en: "New" },
  "kds.col.preparing": { es: "En preparación", pt: "Em preparação", en: "Preparing" },
  "kds.col.ready": { es: "Listos", pt: "Prontos", en: "Ready" },
  "kds.sound.on": { es: "Sonido ON", pt: "Som ON", en: "Sound ON" },
  "kds.sound.enable": { es: "Activar sonido", pt: "Activar som", en: "Enable sound" },
  "kds.fullscreen": { es: "Pantalla completa", pt: "Tela cheia", en: "Fullscreen" },
  "kds.gate.title": { es: "Panel KDS — Acceso interno", pt: "Painel KDS — Acesso interno", en: "KDS panel — Internal access" },
  "kds.gate.body": { es: "Es necesario iniciar sesión como equipo.", pt: "É necessário iniciar sessão como equipa.", en: "You need to sign in as staff." },
  "kds.gate.signin": { es: "Iniciar sesión", pt: "Iniciar sessão", en: "Sign in" },

  // --- Cashier (caixa) ---
  "cashier.title": { es: "Caja", pt: "Caixa", en: "Cashier" },
  "cashier.state.open": { es: "Caja Abierta", pt: "Caixa Aberta", en: "Register open" },
  "cashier.state.closed": { es: "Caja Cerrada", pt: "Caixa Fechada", en: "Register closed" },
  "cashier.action.open": { es: "Abrir Caja", pt: "Abrir Caixa", en: "Open register" },
  "cashier.action.close": { es: "Cerrar Caja", pt: "Fechar Caixa", en: "Close register" },
  "cashier.openedAt": { es: "Abierta a las", pt: "Aberta às", en: "Opened at" },
  "cashier.total.today": { es: "Total Hoy", pt: "Total Hoje", en: "Today's total" },
  "cashier.method.card": { es: "Tarjeta", pt: "Cartão", en: "Card" },
  "cashier.method.cash": { es: "Efectivo", pt: "Dinheiro", en: "Cash" },
  "cashier.method.pix": { es: "Pix", pt: "Pix", en: "Pix" },
  "cashier.orders.count": { es: "pedidos", pt: "pedidos", en: "orders" },
  "cashier.pending.title": { es: "Pagos pendientes", pt: "Pagamentos pendentes", en: "Pending payments" },
  "cashier.pending.empty": { es: "Sin pedidos esperando pago.", pt: "Sem pedidos aguardando pagamento.", en: "No orders awaiting payment." },
  "cashier.shift.title": { es: "Resumen del Turno", pt: "Resumo do Turno", en: "Shift summary" },
  "cashier.balance.opening": { es: "Saldo Inicial", pt: "Saldo Inicial", en: "Opening balance" },
  "cashier.balance.expected": { es: "Saldo Esperado", pt: "Saldo Esperado", en: "Expected balance" },
  "cashier.balance.opening.input": { es: "Saldo Inicial (€)", pt: "Saldo Inicial (€)", en: "Opening balance (€)" },
  "cashier.balance.closing.input": { es: "Saldo Final Contado (€)", pt: "Saldo Final Contado (€)", en: "Counted closing balance (€)" },
  "cashier.sales.cash": { es: "Ventas (Efectivo)", pt: "Vendas (Dinheiro)", en: "Sales (Cash)" },
  "cashier.today.sold": { es: "Total vendido hoy:", pt: "Total vendido hoje:", en: "Sold today:" },

  // --- Delivery (entregador) ---
  "delivery.empty.title": { es: "Sin entregas asignadas", pt: "Sem entregas atribuídas", en: "No deliveries assigned" },
  "delivery.empty.body": {
    es: "Cuando el restaurante asigne un pedido, aparece aquí con dirección y código.",
    pt: "Quando o restaurante atribuir um pedido, aparece aqui com o endereço e código.",
    en: "When the restaurant assigns an order, it shows up here with address and code.",
  },
  "delivery.online": { es: "Online · Recibiendo pedidos", pt: "Online · A receber pedidos", en: "Online · Receiving orders" },
  "delivery.state.on_the_way": { es: "En camino", pt: "A caminho", en: "On the way" },
  "delivery.state.ready": { es: "Listo", pt: "Pronto", en: "Ready" },
  "delivery.cta.start": { es: "Iniciar entrega", pt: "Iniciar entrega", en: "Start delivery" },
  "delivery.cta.starting": { es: "Iniciando…", pt: "A iniciar…", en: "Starting…" },
  "delivery.cta.finish": { es: "Finalizar entrega", pt: "Finalizar entrega", en: "Finish delivery" },
  "delivery.cta.validating": { es: "Validando…", pt: "A validar…", en: "Validating…" },
  "delivery.code.label": { es: "Código del cliente", pt: "Código do cliente", en: "Customer code" },
  "delivery.openRoute": { es: "Abrir ruta", pt: "Abrir rota", en: "Open route" },

  // --- Settings (alta prioridade) ---
  "settings.store.title": { es: "Datos de la tienda", pt: "Dados da loja", en: "Store details" },
  "settings.store.desc": {
    es: "Información mostrada en recibos e impresiones.",
    pt: "Informações exibidas em recibos e impressões.",
    en: "Information shown on receipts and prints.",
  },
  "settings.store.name": { es: "Nombre de la tienda", pt: "Nome da loja", en: "Store name" },
  "settings.store.phone": { es: "Teléfono", pt: "Telefone", en: "Phone" },
  "settings.store.fiscal": { es: "CIF / Identificación fiscal", pt: "CNPJ / Identificação fiscal", en: "Tax ID" },
  "settings.store.address": { es: "Dirección completa", pt: "Endereço completo", en: "Full address" },

  "settings.ops.title": { es: "Operación", pt: "Operação", en: "Operations" },
  "settings.ops.desc": { es: "Cómo se procesan los pedidos.", pt: "Como pedidos são processados.", en: "How orders are processed." },
  "settings.ops.autoaccept": { es: "Aceptar pedidos automáticamente", pt: "Aceitar pedidos automaticamente", en: "Auto-accept orders" },
  "settings.ops.autoaccept.desc": {
    es: "Si está desactivado, cada pedido necesita ser confirmado por el equipo.",
    pt: "Se desactivado, cada pedido precisa ser confirmado pela equipa.",
    en: "When disabled, every order must be confirmed by the team.",
  },
  "settings.ops.cancel": { es: "Permitir cancelación de pedidos", pt: "Permitir cancelamento de pedidos", en: "Allow order cancellation" },
  "settings.ops.cancel.desc": {
    es: "Los operadores pueden cancelar pedidos en curso.",
    pt: "Operadores podem cancelar pedidos em andamento.",
    en: "Operators can cancel ongoing orders.",
  },
  "settings.ops.prepTime": { es: "Tiempo máx. de preparación (min)", pt: "Tempo máx. de preparação (min)", en: "Max prep time (min)" },
  "settings.ops.prefix": { es: "Prefijo del número del pedido", pt: "Prefixo do número do pedido", en: "Order number prefix" },

  "settings.print.title": { es: "Recibo / impresión", pt: "Recibo / impressão", en: "Receipt / print" },
  "settings.print.desc": { es: "Personalice lo que sale en la impresora.", pt: "Personalize o que sai na impressora.", en: "Customize what the printer outputs." },
  "settings.print.auto": { es: "Imprimir automáticamente nuevos pedidos", pt: "Imprimir automaticamente novos pedidos", en: "Auto-print new orders" },
  "settings.print.auto.desc": {
    es: "Envía directo a cocina cuando entra un pedido nuevo.",
    pt: "Envia direto à cozinha quando entra pedido novo.",
    en: "Sends straight to the kitchen on new orders.",
  },
  "settings.print.customer": { es: "Imprimir copia del cliente", pt: "Imprimir via do cliente", en: "Print customer copy" },
  "settings.print.customer.desc": {
    es: "Genera una segunda copia para entregar al cliente.",
    pt: "Gera uma segunda via para entregar ao cliente.",
    en: "Generates a second copy for the customer.",
  },
  "settings.print.footer": { es: "Mensaje en el pie del recibo", pt: "Mensagem no rodapé do recibo", en: "Receipt footer message" },
  "settings.print.tax": { es: "Tasa de servicio (%)", pt: "Taxa de serviço (%)", en: "Service fee (%)" },
  "settings.print.tax.desc": {
    es: "Se añade automáticamente al total. 0 = desactivado.",
    pt: "Adiciona automaticamente ao total. 0 = desactivado.",
    en: "Added automatically to the total. 0 = disabled.",
  },

  "settings.hours.title": { es: "Horario de funcionamiento", pt: "Horário de funcionamento", en: "Operating hours" },
  "settings.hours.desc": {
    es: "Defina los horarios reales por día de la semana, para la tienda y el delivery por separado. Cuando el canal está cerrado, el cliente puede navegar pero no finalizar.",
    pt: "Defina os horários reais por dia da semana, para a loja e o delivery separadamente. Quando o canal está fechado, o cliente pode navegar mas não finalizar.",
    en: "Set real per-day hours for the store and delivery separately. When the channel is closed, customers can browse but not checkout.",
  },
  "settings.hours.loading": { es: "Cargando tienda…", pt: "A carregar loja…", en: "Loading store…" },
} as const satisfies Record<string, Record<StaffUiLang, string>>;


export type StaffI18nKey = keyof typeof STAFF_I18N;

export function staffT(lang: StaffUiLang, key: StaffI18nKey, fallback?: string): string {
  const entry = STAFF_I18N[key];
  if (!entry) return fallback ?? key;
  return entry[lang] ?? entry.es ?? fallback ?? key;
}
