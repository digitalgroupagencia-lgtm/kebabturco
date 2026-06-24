import type { StaffUiLang } from "@/components/StaffLanguageToggle";
import type { FaqSection } from "@/views/admin/guideContent";

const GUIDE_PT: FaqSection[] = [
  {
    title: "Primeiros passos",
    items: [
      {
        q: "Como acedo ao painel?",
        a: "Toque 5 vezes no logótipo do menu do cliente para abrir a Área da equipa. Use o e-mail e a senha que o restaurante lhe deu (ou crie conta / entre com Google).\n\nDepois de entrar, abre o painel do restaurante ou a administração conforme o seu perfil.",
      },
      {
        q: "Como adiciono um membro da equipa?",
        a: "Equipa → Novo Membro. Preencha nome, e-mail, senha, papel e idioma (espanhol por defeito).\n\nApós criar, copie o resumo com instruções e envie ao funcionário (WhatsApp ou copiar). Ele entra na app com esse e-mail e senha (5 toques no logótipo → Área da equipa).",
      },
      {
        q: "Quais são os papéis?",
        a: "Dono do restaurante, Gerente, Operador, Cozinha, Caixa, Atendente, Entregador. Cada um vê só o que precisa no menu lateral.",
      },
    ],
  },
  {
    title: "Pedidos e alertas",
    items: [
      {
        q: "Som e notificações de pedidos novos",
        a: "Em Pedidos ao vivo, active «Activar alertas» (som + push). O som repete até mudar o estado do pedido (ex.: para «A preparar»).",
      },
      {
        q: "Pedido em dinheiro (efectivo)",
        a: "Registe o pagamento na Caixa antes de iniciar a produção. Só depois mude o estado para preparação.",
      },
      {
        q: "Tempo de preparação",
        a: "Ao aceitar um pedido, indique o tempo estimado. O cliente vê a actualização no acompanhamento.",
      },
    ],
  },
  {
    title: "Entregador",
    items: [
      {
        q: "Fluxo do entregador",
        a: "1. Recebe notificação de pedido novo.\n2. Vê entregas atribuídas na área Entregas.\n3. Marca «A caminho» ao sair.\n4. Antes de entregar, pede ao cliente o código de 4 dígitos do pedido.\n5. Introduz o código na app para confirmar — o restaurante valida no painel.",
      },
    ],
  },
  {
    title: "Cozinha e caixa",
    items: [
      { q: "Cozinha", a: "Ecrã de cozinha / pedidos ao vivo. Prepare conforme ticket. Marque «Pronto» quando terminar." },
      { q: "Caixa", a: "Confirme pagamentos em efectivo, imprima talões e consulte o resumo do dia." },
    ],
  },
  {
    title: "Cardápio e configuração",
    items: [
      {
        q: "Alterar produtos ou preços",
        a: "Feito na administração geral → Cardápio. Cada loja tem cardápio independente — mudar preço numa não altera a outra.",
      },
      {
        q: "Personalização (extras, carne, ingredientes)",
        a: "Admin → Personalização. Se estiver vazio, use «Importar personalizações do cardápio». Depois pode editar grupos e opções.",
      },
      {
        q: "Promoções push aos clientes",
        a: "Configurações → Notificações → Promoção push (se activo no plano).",
      },
    ],
  },
  {
    title: "Notificações no tablet",
    items: [
      {
        q: "Quando o tablet toca, imprime e mostra notificação?",
        a: "**App aberto, tela ligada:** som, alerta visual e impressão automática.\n\n**App aberto, tela bloqueada:** som e push; impressão ao desbloquear.\n\n**Outra app em primeiro plano:** push + som; ao tocar na notificação abre o painel e imprime.\n\n**App fechado:** push chega mas a impressão só ao reabrir o painel — deixe o app aberto durante o serviço.",
      },
      {
        q: "O som não está a tocar, o que verifico?",
        a: "1. Botão «Activar alertas» verde em Pedidos ao vivo?\n2. Volume no máximo?\n3. Modo Não Perturbe desligado?\n4. Permissões de notificações activas?\n5. Bateria sem restrições para a app?",
      },
    ],
  },
];

const GUIDE_ES: FaqSection[] = [
  {
    title: "Primeros pasos",
    items: [
      {
        q: "¿Cómo accedo al panel?",
        a: "Toque 5 veces el logotipo del menú del cliente para abrir el Área del equipo. Use el correo y la contraseña que le dio el restaurante (o cree cuenta / entre con Google).\n\nDespués de entrar, se abre el panel del restaurante o la administración según su perfil.",
      },
      {
        q: "¿Cómo añado un miembro del equipo?",
        a: "Equipo → Nuevo miembro. Rellene nombre, correo, contraseña, rol e idioma (español por defecto).\n\nTras crear, copie el resumen con instrucciones y envíelo al empleado. Entra en la app con ese correo y contraseña (5 toques en el logotipo → Área del equipo).",
      },
      {
        q: "¿Cuáles son los roles?",
        a: "Dueño del restaurante, Gerente, Operador, Cocina, Caja, Atendente, Repartidor. Cada uno ve solo lo que necesita en el menú lateral.",
      },
    ],
  },
  {
    title: "Pedidos y alertas",
    items: [
      {
        q: "Sonido y notificaciones de pedidos nuevos",
        a: "En Pedidos en vivo, active «Activar alertas» (sonido + push). El sonido se repite hasta cambiar el estado del pedido (p. ej. a «En preparación»).",
      },
      {
        q: "Pedido en efectivo",
        a: "Registre el pago en Caja antes de iniciar la producción. Solo después cambie el estado a preparación.",
      },
      {
        q: "Tiempo de preparación",
        a: "Al aceptar un pedido, indique el tiempo estimado. El cliente lo ve en el seguimiento.",
      },
    ],
  },
  {
    title: "Repartidor",
    items: [
      {
        q: "Flujo del repartidor",
        a: "1. Recibe notificación de pedido nuevo.\n2. Ve entregas asignadas en el área Entregas.\n3. Marca «En camino» al salir.\n4. Antes de entregar, pide al cliente el código de 4 dígitos.\n5. Introduce el código en la app para confirmar — el restaurante valida en el panel.",
      },
    ],
  },
  {
    title: "Cocina y caja",
    items: [
      { q: "Cocina", a: "Pantalla de cocina / pedidos en vivo. Prepare según el ticket. Marque «Listo» al terminar." },
      { q: "Caja", a: "Confirme pagos en efectivo, imprima tickets y consulte el resumen del día." },
    ],
  },
  {
    title: "Carta y configuración",
    items: [
      {
        q: "Cambiar productos o precios",
        a: "Se hace en la administración general → Carta. Cada tienda tiene carta independiente — cambiar precio en una no altera la otra.",
      },
      {
        q: "Personalización (extras, carne, ingredientes)",
        a: "Admin → Personalización. Si está vacío, use «Importar personalizaciones de la carta». Luego puede editar grupos y opciones.",
      },
      {
        q: "Promociones push a clientes",
        a: "Configuración → Notificaciones → Promoción push (si está activo en el plan).",
      },
    ],
  },
  {
    title: "Notificaciones en la tablet",
    items: [
      {
        q: "¿Cuándo suena, imprime y muestra notificación?",
        a: "**App abierta, pantalla encendida:** sonido, alerta visual e impresión automática.\n\n**App abierta, pantalla bloqueada:** sonido y push; impresión al desbloquear.\n\n**Otra app en primer plano:** push + sonido; al tocar la notificación abre el panel e imprime.\n\n**App cerrada:** llega el push pero la impresión solo al reabrir el panel — deje la app abierta durante el servicio.",
      },
      {
        q: "El sonido no suena, ¿qué compruebo?",
        a: "1. ¿Botón «Activar alertas» verde en Pedidos en vivo?\n2. ¿Volumen al máximo?\n3. ¿Modo No molestar desactivado?\n4. ¿Permisos de notificaciones activos?\n5. ¿Batería sin restricciones para la app?",
      },
    ],
  },
];

const GUIDE_EN: FaqSection[] = [
  {
    title: "Getting started",
    items: [
      {
        q: "How do I access the panel?",
        a: "Tap the customer menu logo 5 times to open the Staff area. Use the email and password the restaurant gave you (or sign up / sign in with Google).\n\nAfter signing in, you open the restaurant panel or admin area depending on your role.",
      },
      {
        q: "How do I add a team member?",
        a: "Team → New member. Fill in name, email, password, role and language (Spanish by default).\n\nAfter creating, copy the summary with instructions and send it to the employee. They sign in with that email and password (5 taps on the logo → Staff area).",
      },
      {
        q: "What are the roles?",
        a: "Restaurant owner, Manager, Operator, Kitchen, Cashier, Attendant, Driver. Each role only sees what they need in the sidebar.",
      },
    ],
  },
  {
    title: "Orders and alerts",
    items: [
      {
        q: "Sound and notifications for new orders",
        a: "In Live orders, enable «Enable alerts» (sound + push). Sound repeats until the order status changes (e.g. to Preparing).",
      },
      {
        q: "Cash order",
        a: "Record payment in Cashier before starting production. Only then change status to preparing.",
      },
      {
        q: "Prep time",
        a: "When accepting an order, enter the estimated time. The customer sees it in order tracking.",
      },
    ],
  },
  {
    title: "Driver",
    items: [
      {
        q: "Driver flow",
        a: "1. Receives new order notification.\n2. Sees assigned deliveries in Deliveries.\n3. Marks Out for delivery when leaving.\n4. Before delivering, asks the customer for the 4-digit code.\n5. Enters the code in the app to confirm — the restaurant validates in the panel.",
      },
    ],
  },
  {
    title: "Kitchen and cashier",
    items: [
      { q: "Kitchen", a: "Kitchen screen / live orders. Prepare per ticket. Mark Ready when done." },
      { q: "Cashier", a: "Confirm cash payments, print receipts and check the daily summary." },
    ],
  },
  {
    title: "Menu and settings",
    items: [
      {
        q: "Change products or prices",
        a: "Done in general admin → Menu. Each store has an independent menu — changing price in one store does not affect another.",
      },
      {
        q: "Customization (extras, protein, ingredients)",
        a: "Admin → Customization. If empty, use «Import customizations from menu». Then edit groups and options.",
      },
      {
        q: "Push promos to customers",
        a: "Settings → Notifications → Push promotion (if enabled on your plan).",
      },
    ],
  },
  {
    title: "Tablet notifications",
    items: [
      {
        q: "When does the tablet sound, print and notify?",
        a: "**App open, screen on:** sound, visual alert and automatic printing.\n\n**App open, screen locked:** sound and push; print when unlocked.\n\n**Another app in foreground:** push + sound; tapping the notification opens the panel and prints.\n\n**App closed:** push arrives but printing only when reopening the panel — keep the app open during service.",
      },
      {
        q: "Sound not working — what should I check?",
        a: "1. Is «Enable alerts» green in Live orders?\n2. Volume at maximum?\n3. Do Not Disturb off?\n4. Notification permissions enabled?\n5. Battery unrestricted for the app?",
      },
    ],
  },
];

const BY_LANG: Record<StaffUiLang, FaqSection[]> = {
  pt: GUIDE_PT,
  es: GUIDE_ES,
  en: GUIDE_EN,
};

export function getRestaurantGuideSections(lang: StaffUiLang): FaqSection[] {
  return BY_LANG[lang] ?? GUIDE_ES;
}

/** @deprecated Use getRestaurantGuideSections(lang) */
export const RESTAURANT_GUIDE_SECTIONS = GUIDE_PT;
