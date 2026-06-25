import {
  evaluateSchedule,
  parseSchedule,
  STORE_DEFAULTS,
  type WeeklySchedule,
} from "@/lib/storeHours";

export type MessageLocale = "pt" | "es" | "en";

export type TemplateContext = {
  storeName: string;
  customerName?: string | null;
  customerPhone?: string;
  locale: MessageLocale;
  weeklySchedule?: WeeklySchedule;
  timezone?: string;
  featuredProductName?: string;
  featuredProductPrice?: string;
  featuredCategoryName?: string;
  couponCode?: string;
  couponDiscount?: string;
  stampsRemaining?: number;
  menuUrl?: string;
};

function pickI18n(json: unknown, locale: MessageLocale, fallback = ""): string {
  if (!json || typeof json !== "object") return fallback;
  const o = json as Record<string, string>;
  return o[locale] || o.es || o.pt || o.en || fallback;
}

export function normalizeMessageLocale(raw: string | null | undefined): MessageLocale {
  const v = (raw ?? "es").toLowerCase();
  if (v.startsWith("pt")) return "pt";
  if (v.startsWith("en")) return "en";
  return "es";
}

export function resolveLocaleFromMode(
  mode: string | null | undefined,
  customerLocale: MessageLocale,
  storeDefault: MessageLocale = "es",
): MessageLocale {
  switch (mode) {
    case "fixed_pt":
      return "pt";
    case "fixed_es":
      return "es";
    case "fixed_en":
      return "en";
    case "store_default":
      return storeDefault;
    case "customer_last":
    default:
      return customerLocale;
  }
}

export function pickLocalizedCampaignText(
  campaign: {
    title?: string | null;
    message_template: string;
    title_pt?: string | null;
    title_es?: string | null;
    title_en?: string | null;
    message_pt?: string | null;
    message_es?: string | null;
    message_en?: string | null;
  },
  locale: MessageLocale,
): { title: string; body: string } {
  const title =
    (locale === "pt" ? campaign.title_pt : locale === "en" ? campaign.title_en : campaign.title_es) ||
    campaign.title ||
    campaign.message_template.slice(0, 40);
  const body =
    (locale === "pt" ? campaign.message_pt : locale === "en" ? campaign.message_en : campaign.message_es) ||
    campaign.message_template;
  return { title: title ?? "", body: body ?? "" };
}

function formatTodayHours(schedule: WeeklySchedule, timezone: string): string {
  const status = evaluateSchedule(schedule, timezone);
  if (status.currentRange) {
    return `${status.currentRange[0]}–${status.currentRange[1]}`;
  }
  if (status.nextOpenLabel) {
    return status.nextOpenLabel;
  }
  return "—";
}

function formatNextOpen(schedule: WeeklySchedule, timezone: string): string {
  const status = evaluateSchedule(schedule, timezone);
  if (status.nextOpenDayLabel && status.nextOpenLabel) {
    return `${status.nextOpenDayLabel} ${status.nextOpenLabel}`;
  }
  return status.nextOpenLabel ?? "em breve";
}

export function buildTemplateVars(ctx: TemplateContext): Record<string, string> {
  const schedule = ctx.weeklySchedule ?? STORE_DEFAULTS;
  const tz = ctx.timezone ?? "Europe/Madrid";
  return {
    nome_restaurante: ctx.storeName,
    nome_cliente: ctx.customerName?.trim() || "Cliente",
    horario_hoje: formatTodayHours(schedule, tz),
    proxima_abertura: formatNextOpen(schedule, tz),
    produto_destaque: ctx.featuredProductName ?? "o nosso especial",
    preco_destaque: ctx.featuredProductPrice ?? "",
    categoria_destaque: ctx.featuredCategoryName ?? "",
    cupao_codigo: ctx.couponCode ?? "",
    desconto: ctx.couponDiscount ?? "10%",
    carimbos_faltam: String(ctx.stampsRemaining ?? 2),
    link_menu: ctx.menuUrl ?? "/",
  };
}

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/gi, (_, key: string) => vars[key] ?? `{${key}}`);
}

export function resolveCampaignMessage(
  template: string,
  ctx: TemplateContext,
): string {
  return applyTemplate(template, buildTemplateVars(ctx));
}

export function productNameForLocale(nameJson: unknown, locale: MessageLocale): string {
  return pickI18n(nameJson, locale, "Produto");
}

export function isQuietHours(now: Date, timezone: string): boolean {
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
  // Quiet hours 23:00–09:00
  return mins >= 23 * 60 || mins < 9 * 60;
}

export function isStoreOpenNow(scheduleRaw: unknown, timezone: string): boolean {
  const schedule = parseSchedule(scheduleRaw, STORE_DEFAULTS);
  return evaluateSchedule(schedule, timezone).open;
}

export function formatPrice(value: number, locale: MessageLocale): string {
  const code = locale === "en" ? "en-GB" : locale === "pt" ? "pt-PT" : "es-ES";
  return new Intl.NumberFormat(code, { style: "currency", currency: "EUR" }).format(value);
}
