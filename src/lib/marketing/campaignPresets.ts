export type CampaignTriggerEvent =
  | "first_order"
  | "inactive"
  | "loyalty_threshold"
  | "schedule_cron"
  | "store_open"
  | "new_subscriber"
  | "manual_only";

export type CampaignSendMode = "auto" | "manual" | "scheduled";
export type CampaignOrigin = "preset" | "custom";
export type CampaignLanguageMode = "customer_last" | "store_default" | "fixed_pt" | "fixed_es" | "fixed_en";

export type CampaignPresetDefinition = {
  key: string;
  name: string;
  description: string;
  campaignType: string;
  triggerEvent: CampaignTriggerEvent;
  triggerDays?: number;
  sendMode: CampaignSendMode;
  audienceType: string;
  audienceConfig?: Record<string, unknown>;
  onlyWhenOpen?: boolean;
  scheduleTime?: string;
  scheduleDays?: number[];
  quietHoursEnabled?: boolean;
  icon: "welcome" | "winback" | "loyalty" | "promo" | "operational" | "subscriber";
  accent: string;
  suggestCoupon?: string;
  title: { pt: string; es: string; en: string };
  message: { pt: string; es: string; en: string };
  variables: string[];
};

export const WINBACK_SUGGESTED_COUPON = "VOLTA10";

export const CAMPAIGN_PRESETS: CampaignPresetDefinition[] = [
  {
    key: "welcome_2d",
    name: "Boas-vindas +2 dias",
    description: "Agradece após a primeira encomenda e convida a voltar.",
    campaignType: "welcome",
    triggerEvent: "first_order",
    triggerDays: 2,
    sendMode: "auto",
    audienceType: "first_order_recent",
    icon: "welcome",
    accent: "from-amber-900/30 to-amber-700/10",
    title: {
      pt: "Obrigado pela primeira encomenda!",
      es: "¡Gracias por tu primer pedido!",
      en: "Thanks for your first order!",
    },
    message: {
      pt: "Volte em breve — temos novidades na carta.",
      es: "Vuelve pronto — tenemos novedades en la carta.",
      en: "Come back soon — we have menu news.",
    },
    variables: ["nome_restaurante", "nome_cliente", "link_menu"],
  },
  {
    key: "welcome_5d",
    name: "Reforço +5 dias",
    description: "Segundo toque para novos clientes.",
    campaignType: "welcome",
    triggerEvent: "first_order",
    triggerDays: 5,
    sendMode: "auto",
    audienceType: "first_order_recent",
    icon: "welcome",
    accent: "from-orange-900/30 to-orange-700/10",
    title: {
      pt: "Como foi a experiência?",
      es: "¿Cómo fue la experiencia?",
      en: "How was your experience?",
    },
    message: {
      pt: "Peça de novo hoje com entrega rápida.",
      es: "Pide de nuevo hoy con entrega rápida.",
      en: "Order again today with fast delivery.",
    },
    variables: ["nome_restaurante", "link_menu"],
  },
  {
    key: "new_subscriber",
    name: "Novo subscritor push",
    description: "Quando alguém activa notificações de marketing.",
    campaignType: "subscriber",
    triggerEvent: "new_subscriber",
    sendMode: "auto",
    audienceType: "marketing_subscribers",
    icon: "subscriber",
    accent: "from-sky-900/30 to-sky-700/10",
    title: {
      pt: "Bem-vindo às nossas notificações!",
      es: "¡Bienvenido a nuestras notificaciones!",
      en: "Welcome to our notifications!",
    },
    message: {
      pt: "Active as notificações e receba ofertas exclusivas.",
      es: "Activa las notificaciones y recibe ofertas exclusivas.",
      en: "Enable notifications and get exclusive offers.",
    },
    variables: ["nome_restaurante"],
  },
  {
    key: "winback_30d",
    name: "Winback 30 dias",
    description: "Reactiva clientes inactivos há um mês.",
    campaignType: "winback",
    triggerEvent: "inactive",
    triggerDays: 30,
    sendMode: "auto",
    audienceType: "inactive_customers",
    icon: "winback",
    accent: "from-rose-900/30 to-rose-700/10",
    suggestCoupon: WINBACK_SUGGESTED_COUPON,
    title: {
      pt: "Sentimos a sua falta",
      es: "Te echamos de menos",
      en: "We miss you",
    },
    message: {
      pt: "Há tempo que não pede — volte hoje! Use {cupao_codigo} se tiver cupão.",
      es: "¡Hace tiempo que no pides — vuelve hoy! Usa {cupao_codigo} si tienes cupón.",
      en: "It's been a while — come back today! Use {cupao_codigo} if you have a coupon.",
    },
    variables: ["nome_cliente", "cupao_codigo", "desconto", "link_menu"],
  },
  {
    key: "winback_60d",
    name: "Winback 60 dias",
    description: "Oferta mais forte para clientes muito inactivos.",
    campaignType: "winback",
    triggerEvent: "inactive",
    triggerDays: 60,
    sendMode: "auto",
    audienceType: "inactive_customers",
    icon: "winback",
    accent: "from-pink-900/30 to-pink-700/10",
    suggestCoupon: WINBACK_SUGGESTED_COUPON,
    title: {
      pt: "Oferta especial para si",
      es: "Oferta especial para ti",
      en: "Special offer for you",
    },
    message: {
      pt: "Fazemos falta? Volte connosco — {desconto} com {cupao_codigo}.",
      es: "¿Nos echas de menos? Vuelve — {desconto} con {cupao_codigo}.",
      en: "Miss us? Come back — {desconto} with {cupao_codigo}.",
    },
    variables: ["nome_cliente", "cupao_codigo", "desconto"],
  },
  {
    key: "loyalty_almost",
    name: "Quase recompensa",
    description: "Avisa quando faltam poucos carimbos.",
    campaignType: "loyalty",
    triggerEvent: "loyalty_threshold",
    sendMode: "auto",
    audienceType: "loyalty_near_reward",
    audienceConfig: { stamps_threshold: 8 },
    icon: "loyalty",
    accent: "from-violet-900/30 to-violet-700/10",
    title: {
      pt: "Quase lá!",
      es: "¡Casi lo tienes!",
      en: "Almost there!",
    },
    message: {
      pt: "Faltam só {carimbos_faltam} carimbos para o seu prémio em {nome_restaurante}!",
      es: "¡Solo faltan {carimbos_faltam} sellos para tu premio en {nome_restaurante}!",
      en: "Only {carimbos_faltam} stamps left for your reward at {nome_restaurante}!",
    },
    variables: ["carimbos_faltam", "nome_restaurante", "nome_cliente"],
  },
  {
    key: "promo_weekend",
    name: "Promo fim-de-semana",
    description: "Push agendado sábado e domingo.",
    campaignType: "promo",
    triggerEvent: "schedule_cron",
    sendMode: "scheduled",
    audienceType: "all_subscribers",
    scheduleDays: [6, 0],
    icon: "promo",
    accent: "from-emerald-900/30 to-emerald-700/10",
    title: {
      pt: "Promoção de fim-de-semana",
      es: "Promoción de fin de semana",
      en: "Weekend promo",
    },
    message: {
      pt: "Este fim-de-semana: {produto_destaque} por {preco_destaque}!",
      es: "¡Este fin de semana: {produto_destaque} por {preco_destaque}!",
      en: "This weekend: {produto_destaque} for {preco_destaque}!",
    },
    variables: ["produto_destaque", "preco_destaque", "categoria_destaque", "link_menu"],
  },
  {
    key: "promo_lunch",
    name: "Promo almoço",
    description: "Lembrete ao meio-dia em dias úteis.",
    campaignType: "promo",
    triggerEvent: "schedule_cron",
    sendMode: "scheduled",
    audienceType: "all_subscribers",
    scheduleTime: "12:30",
    scheduleDays: [1, 2, 3, 4, 5],
    onlyWhenOpen: true,
    icon: "promo",
    accent: "from-lime-900/30 to-lime-700/10",
    title: {
      pt: "Oferta de almoço",
      es: "Oferta de almuerzo",
      en: "Lunch offer",
    },
    message: {
      pt: "Hoje ao almoço: {produto_destaque} — peça já em {link_menu}",
      es: "Hoy al mediodía: {produto_destaque} — ¡pide ya en {link_menu}!",
      en: "Lunch today: {produto_destaque} — order at {link_menu}",
    },
    variables: ["produto_destaque", "preco_destaque", "horario_hoje", "link_menu"],
  },
  {
    key: "open_now",
    name: "Estamos abertos",
    description: "Avisa quando a loja abre.",
    campaignType: "operational",
    triggerEvent: "store_open",
    sendMode: "auto",
    audienceType: "all_subscribers",
    onlyWhenOpen: true,
    icon: "operational",
    accent: "from-green-900/30 to-green-700/10",
    title: {
      pt: "Estamos abertos!",
      es: "¡Estamos abiertos!",
      en: "We're open!",
    },
    message: {
      pt: "{nome_restaurante} está aberto! Horário hoje: {horario_hoje}.",
      es: "¡{nome_restaurante} está abierto! Horario hoy: {horario_hoje}.",
      en: "{nome_restaurante} is open! Today's hours: {horario_hoje}.",
    },
    variables: ["nome_restaurante", "horario_hoje", "link_menu"],
  },
  {
    key: "closed_soon",
    name: "Fecha em breve",
    description: "Última chamada antes de fechar.",
    campaignType: "operational",
    triggerEvent: "store_open",
    sendMode: "auto",
    audienceType: "all_subscribers",
    audienceConfig: { closing_soon_minutes: 30 },
    icon: "operational",
    accent: "from-stone-900/30 to-stone-700/10",
    title: {
      pt: "Última chamada",
      es: "Última llamada",
      en: "Last call",
    },
    message: {
      pt: "Fechamos em breve — volta {proxima_abertura}.",
      es: "Cerramos pronto — vuelve {proxima_abertura}.",
      en: "Closing soon — back {proxima_abertura}.",
    },
    variables: ["proxima_abertura", "horario_hoje", "link_menu"],
  },
  {
    key: "promo_delivery_free",
    name: "Entrega grátis +20€",
    description: "Push com cupão de entrega grátis para pedidos acima de 20€.",
    campaignType: "promo",
    triggerEvent: "manual_only",
    sendMode: "manual",
    audienceType: "all_subscribers",
    icon: "promo",
    accent: "from-sky-900/30 to-sky-700/10",
    suggestCoupon: "ENTREGA20",
    title: {
      pt: "Entrega grátis hoje 🛵",
      es: "¡Envío gratis hoy! 🛵",
      en: "Free delivery today 🛵",
    },
    message: {
      pt: "Pedidos a partir de 20€ — use {cupao_codigo} no checkout.",
      es: "Pedidos desde 20€ — usa {cupao_codigo} al pagar.",
      en: "Orders over €20 — use {cupao_codigo} at checkout.",
    },
    variables: ["cupao_codigo", "nome_restaurante", "link_menu"],
  },
  {
    key: "promo_combo_kebab",
    name: "Combo 3 kebabs",
    description: "3.º produto em destaque à metade do preço.",
    campaignType: "promo",
    triggerEvent: "manual_only",
    sendMode: "manual",
    audienceType: "all_subscribers",
    icon: "promo",
    accent: "from-orange-900/30 to-orange-700/10",
    suggestCoupon: "KEBAB3X2",
    title: {
      pt: "Combo especial 🥙",
      es: "¡Combo especial! 🥙",
      en: "Special combo 🥙",
    },
    message: {
      pt: "Peça 3 {produto_destaque} — 3.º com 50% off. Código {cupao_codigo}.",
      es: "Pide 3 {produto_destaque} — 3.º con 50% dto. Código {cupao_codigo}.",
      en: "Get 3 {produto_destaque} — 3rd 50% off. Code {cupao_codigo}.",
    },
    variables: ["produto_destaque", "cupao_codigo", "link_menu"],
  },
];

export function getPresetByKey(key: string): CampaignPresetDefinition | undefined {
  return CAMPAIGN_PRESETS.find((p) => p.key === key);
}

export function isWinbackPreset(key: string | null | undefined): boolean {
  return key === "winback_30d" || key === "winback_60d";
}

export function presetNeedsCoupon(key: string | null | undefined): boolean {
  if (!key) return false;
  return Boolean(getPresetByKey(key)?.suggestCoupon) || isWinbackPreset(key);
}

export const TEMPLATE_VARIABLES = [
  "nome_restaurante",
  "nome_cliente",
  "horario_hoje",
  "proxima_abertura",
  "produto_destaque",
  "preco_destaque",
  "categoria_destaque",
  "cupao_codigo",
  "desconto",
  "carimbos_faltam",
  "link_menu",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];
