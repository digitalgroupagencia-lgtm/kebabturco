import { applyTemplate, buildVars, type MessageLocale } from "./campaignTemplateEngine.ts";

/** Horários de envio por dia (fase boas-vindas e relação). */
export const LIFECYCLE_SLOTS = ["11:30", "14:30", "19:00", "21:00"] as const;

export const WELCOME_PHASE_DAYS = 30;
export const RELATION_PHASE_DAYS = 60;

export type LifecycleStage = "welcome" | "relation";

type MsgPair = { title: string; body: string };

const WELCOME_MSG: Record<MessageLocale, MsgPair[]> = {
  pt: [
    { title: "Família reunida?", body: "Kebab ou pizza hoje em {nome_restaurante}, peça em {link_menu}" },
    { title: "Hora do almoço", body: "Que tal um kebab especial? Entrega rápida em {link_menu}" },
    { title: "Jantar fácil", body: "Chame os amigos, menu completo em {nome_restaurante}" },
    { title: "Sexta merece kebab", body: "Peça agora e receba quente em casa" },
    { title: "Novidade na carta", body: "Experimente o nosso destaque: {produto_destaque} por {preco_destaque}" },
    { title: "Fome de pizza?", body: "Também temos pizza, veja em {link_menu}" },
    { title: "Boa tarde!", body: "Um kebab hoje? {nome_restaurante} está à distância de um toque" },
    { title: "Oferta do dia", body: "Peça {produto_destaque}, só hoje com entrega rápida" },
    { title: "Domingo em família", body: "Kebab para todos, peça em {link_menu}" },
    { title: "Bem-vindo de volta", body: "Obrigado por escolher {nome_restaurante}. Peça outra vez!" },
    { title: "Almoço sem filas", body: "Peça pelo telemóvel e evite espera" },
    { title: "Noite de kebab", body: "Jantar resolvido em minutos, {link_menu}" },
    { title: "Combo perfeito", body: "Kebab + bebida? Veja as opções em {link_menu}" },
    { title: "Só entre nós", body: "Clientes novos adoram {produto_destaque}, experimente" },
    { title: "Hoje combina", body: "Tempo bom para pedir, entrega em {nome_restaurante}" },
    { title: "Fim de tarde", body: "Um snack antes do jantar? Kebab em {link_menu}" },
    { title: "Sem cozinhar", body: "Deixe connosco, peça já em {nome_restaurante}" },
    { title: "Repetir o favorito?", body: "O seu kebab favorito está a um clique" },
    { title: "Fome agora?", body: "Abra {link_menu} e peça em 2 minutos" },
    { title: "Últimos dias de boas-vindas", body: "Aproveite, em breve passa à fase relação com mais surpresas" },
  ],
  es: [
    { title: "¿Familia reunida?", body: "¿Kebab o pizza hoy en {nome_restaurante}? Pide en {link_menu}" },
    { title: "Hora del almuerzo", body: "¿Un kebab especial? Entrega rápida en {link_menu}" },
    { title: "Cena fácil", body: "Llama a los amigos, menú completo en {nome_restaurante}" },
    { title: "El viernes merece kebab", body: "Pide ahora y recibe caliente en casa" },
    { title: "Novedad en la carta", body: "Prueba nuestro destacado: {produto_destaque} por {preco_destaque}" },
    { title: "¿Antojo de pizza?", body: "También tenemos pizza, mira en {link_menu}" },
    { title: "¡Buenas tardes!", body: "¿Un kebab hoy? {nome_restaurante} a un toque" },
    { title: "Oferta del día", body: "Pide {produto_destaque}, hoy con entrega rápida" },
    { title: "Domingo en familia", body: "Kebab para todos, pide en {link_menu}" },
    { title: "Bienvenido de nuevo", body: "Gracias por elegir {nome_restaurante}. ¡Pide otra vez!" },
    { title: "Almuerzo sin colas", body: "Pide desde el móvil y evita esperas" },
    { title: "Noche de kebab", body: "Cena resuelta en minutos, {link_menu}" },
    { title: "Combo perfecto", body: "¿Kebab + bebida? Mira en {link_menu}" },
    { title: "Solo entre nosotros", body: "A los nuevos les encanta {produto_destaque}, pruébalo" },
    { title: "Hoy combina", body: "Buen momento para pedir, entrega en {nome_restaurante}" },
    { title: "Última hora", body: "¿Un snack antes de cenar? Kebab en {link_menu}" },
    { title: "Sin cocinar", body: "Déjalo con nosotros, pide ya en {nome_restaurante}" },
    { title: "¿Repetir el favorito?", body: "Tu kebab favorito está a un clic" },
    { title: "¿Hambre ahora?", body: "Abre {link_menu} y pide en 2 minutos" },
    { title: "Últimos días de bienvenida", body: "Aprovecha, pronto pasarás a la fase relación con más sorpresas" },
  ],
  en: [
    { title: "Family time?", body: "Kebab or pizza today at {nome_restaurante}, order at {link_menu}" },
    { title: "Lunch time", body: "Fancy a special kebab? Fast delivery at {link_menu}" },
    { title: "Easy dinner", body: "Call your friends, full menu at {nome_restaurante}" },
    { title: "Friday deserves kebab", body: "Order now and get it hot at home" },
    { title: "Menu news", body: "Try our highlight: {produto_destaque} for {preco_destaque}" },
    { title: "Pizza craving?", body: "We have pizza too, see {link_menu}" },
    { title: "Good afternoon!", body: "Kebab today? {nome_restaurante} is one tap away" },
    { title: "Deal of the day", body: "Order {produto_destaque}, fast delivery today" },
    { title: "Sunday family", body: "Kebab for everyone, order at {link_menu}" },
    { title: "Welcome back", body: "Thanks for choosing {nome_restaurante}. Order again!" },
    { title: "Skip the queue", body: "Order on your phone and save time" },
    { title: "Kebab night", body: "Dinner sorted in minutes, {link_menu}" },
    { title: "Perfect combo", body: "Kebab + drink? Check {link_menu}" },
    { title: "Just for you", body: "New customers love {produto_destaque}, try it" },
    { title: "Great day to order", body: "Delivery from {nome_restaurante}" },
    { title: "Afternoon snack", body: "Kebab before dinner? {link_menu}" },
    { title: "No cooking", body: "Leave it to us, order at {nome_restaurante}" },
    { title: "Repeat your favourite?", body: "Your favourite kebab is one tap away" },
    { title: "Hungry now?", body: "Open {link_menu} and order in 2 minutes" },
    { title: "Last welcome days", body: "Enjoy, soon you'll move to our relationship phase" },
  ],
};

const RELATION_MSG: Record<MessageLocale, MsgPair[]> = {
  pt: [
    { title: "Sentimos a sua falta", body: "Já passou algum tempo, volte a {nome_restaurante}" },
    { title: "Cliente especial", body: "Temos novidades para si em {link_menu}" },
    { title: "Kebab à hora de sempre", body: "O seu pedido habitual está à espera" },
    { title: "Fim de semana connosco", body: "Peça em família, {produto_destaque} em destaque" },
    { title: "Lembrete amigável", body: "Quando quiser, estamos em {link_menu}" },
    { title: "Oferta de relação", body: "Obrigado por ser cliente, veja {cupao_codigo} se tiver cupão activo" },
    { title: "Hoje combina kebab", body: "{nome_restaurante}, entrega rápida como sempre" },
    { title: "Pizza ou kebab?", body: "Escolha em {link_menu}, entregamos já" },
    { title: "Boa semana", body: "Comece bem com um kebab de {nome_restaurante}" },
    { title: "Continuamos aqui", body: "Sempre que tiver fome, {link_menu}" },
  ],
  es: [
    { title: "Te echamos de menos", body: "Ha pasado un tiempo, vuelve a {nome_restaurante}" },
    { title: "Cliente especial", body: "Tenemos novedades para ti en {link_menu}" },
    { title: "Kebab a tu hora", body: "Tu pedido habitual te espera" },
    { title: "Fin de semana con nosotros", body: "Pide en familia, {produto_destaque} destacado" },
    { title: "Recordatorio amable", body: "Cuando quieras, estamos en {link_menu}" },
    { title: "Oferta de relación", body: "Gracias por ser cliente, mira {cupao_codigo} si tienes cupón" },
    { title: "Hoy combina kebab", body: "{nome_restaurante}, entrega rápida como siempre" },
    { title: "¿Pizza o kebab?", body: "Elige en {link_menu}, entregamos ya" },
    { title: "Buena semana", body: "Empieza bien con un kebab de {nome_restaurante}" },
    { title: "Seguimos aquí", body: "Cuando tengas hambre, {link_menu}" },
  ],
  en: [
    { title: "We miss you", body: "It's been a while, come back to {nome_restaurante}" },
    { title: "Special customer", body: "We have news for you at {link_menu}" },
    { title: "Kebab at your usual time", body: "Your usual order is waiting" },
    { title: "Weekend with us", body: "Order for family, {produto_destaque} featured" },
    { title: "Friendly reminder", body: "Whenever you want, we're at {link_menu}" },
    { title: "Loyalty offer", body: "Thanks for being a customer, check {cupao_codigo}" },
    { title: "Kebab day", body: "{nome_restaurante}, fast delivery as always" },
    { title: "Pizza or kebab?", body: "Choose at {link_menu}, we deliver now" },
    { title: "Good week", body: "Start well with a kebab from {nome_restaurante}" },
    { title: "Still here", body: "Whenever you're hungry, {link_menu}" },
  ],
};

export function lifecycleDayIndex(startedAt: string, timezone: string): number {
  const start = new Date(startedAt);
  const now = new Date();
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const startDay = fmt(start);
  const today = fmt(now);
  if (startDay === today) return 1;
  const msPerDay = 86400000;
  const diff = Math.floor((now.getTime() - start.getTime()) / msPerDay) + 1;
  return Math.max(1, diff);
}

export function resolveLifecycleStage(day: number): LifecycleStage | null {
  if (day <= WELCOME_PHASE_DAYS) return "welcome";
  if (day <= WELCOME_PHASE_DAYS + RELATION_PHASE_DAYS) return "relation";
  return null;
}

export function lifecycleSlotIndex(now: Date, timezone: string): number | null {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const mins = hour * 60 + minute;

  for (let i = 0; i < LIFECYCLE_SLOTS.length; i++) {
    const [hh, mm] = LIFECYCLE_SLOTS[i].split(":").map(Number);
    const target = (hh ?? 0) * 60 + (mm ?? 0);
    if (Math.abs(mins - target) <= 30) return i;
  }
  return null;
}

export function buildLifecycleMessage(
  stage: LifecycleStage,
  day: number,
  slot: number,
  locale: MessageLocale,
  vars: ReturnType<typeof buildVars>,
): { title: string; body: string } {
  const pool = stage === "welcome" ? WELCOME_MSG[locale] : RELATION_MSG[locale];
  const idx = (day * LIFECYCLE_SLOTS.length + slot) % pool.length;
  const pick = pool[idx] ?? pool[0];
  return {
    title: applyTemplate(pick.title, vars),
    body: applyTemplate(pick.body, vars),
  };
}
