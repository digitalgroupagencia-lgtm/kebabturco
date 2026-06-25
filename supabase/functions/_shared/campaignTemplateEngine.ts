/** Shared template helpers for edge functions (Deno). */

export type MessageLocale = "pt" | "es" | "en";

export function normalizeLocale(raw: string | null | undefined): MessageLocale {
  const v = (raw ?? "es").toLowerCase();
  if (v.startsWith("pt")) return "pt";
  if (v.startsWith("en")) return "en";
  return "es";
}

export function resolveLocaleFromMode(
  mode: string | null | undefined,
  customerLocale: MessageLocale,
): MessageLocale {
  switch (mode) {
    case "fixed_pt":
      return "pt";
    case "fixed_es":
      return "es";
    case "fixed_en":
      return "en";
    case "store_default":
      return "es";
    case "customer_last":
    default:
      return customerLocale;
  }
}

export function pickLocalized(
  campaign: Record<string, unknown>,
  locale: MessageLocale,
): { title: string; body: string } {
  const titleKey = locale === "pt" ? "title_pt" : locale === "en" ? "title_en" : "title_es";
  const bodyKey = locale === "pt" ? "message_pt" : locale === "en" ? "message_en" : "message_es";
  const title = String(campaign[titleKey] ?? campaign.title ?? "");
  const body = String(campaign[bodyKey] ?? campaign.message_template ?? "");
  return { title, body };
}

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/gi, (_, key: string) => vars[key] ?? `{${key}}`);
}

export function pickI18n(json: unknown, locale: MessageLocale, fallback = ""): string {
  if (!json || typeof json !== "object") return fallback;
  const o = json as Record<string, string>;
  return o[locale] || o.es || o.pt || o.en || fallback;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function nowInTz(timezone: string, now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dayIdx: map[weekday] ?? 0, minutes: hour * 60 + minute };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number(n) || 0);
  return h * 60 + m;
}

export function isStoreOpen(scheduleRaw: unknown, timezone: string): boolean {
  if (!scheduleRaw || typeof scheduleRaw !== "object") return true;
  const { dayIdx, minutes } = nowInTz(timezone);
  const key = DAY_KEYS[dayIdx];
  const day = (scheduleRaw as Record<string, { open?: boolean; ranges?: [string, string][] }>)[key];
  if (!day?.open || !day.ranges?.length) return false;
  return day.ranges.some(([a, b]) => {
    const start = toMinutes(a);
    const end = b === "24:00" ? 24 * 60 : toMinutes(b);
    return minutes >= start && minutes < end;
  });
}

export function isQuietHours(timezone: string, now = new Date()): boolean {
  const { minutes } = nowInTz(timezone, now);
  return minutes >= 23 * 60 || minutes < 9 * 60;
}

export function formatTodayHours(scheduleRaw: unknown, timezone: string): string {
  if (!scheduleRaw || typeof scheduleRaw !== "object") return "—";
  const { dayIdx } = nowInTz(timezone);
  const key = DAY_KEYS[dayIdx];
  const day = (scheduleRaw as Record<string, { open?: boolean; ranges?: [string, string][] }>)[key];
  if (!day?.open || !day.ranges?.length) return "Fechado";
  return day.ranges.map(([a, b]) => `${a}–${b}`).join(", ");
}

export function buildVars(ctx: {
  storeName: string;
  customerName?: string | null;
  scheduleRaw?: unknown;
  timezone?: string;
  productName?: string;
  productPrice?: string;
  categoryName?: string;
  couponCode?: string;
  couponDiscount?: string;
  stampsRemaining?: number;
  menuUrl?: string;
}): Record<string, string> {
  const tz = ctx.timezone ?? "Europe/Madrid";
  return {
    nome_restaurante: ctx.storeName,
    nome_cliente: ctx.customerName?.trim() || "Cliente",
    horario_hoje: formatTodayHours(ctx.scheduleRaw, tz),
    proxima_abertura: "amanhã",
    produto_destaque: ctx.productName ?? "",
    preco_destaque: ctx.productPrice ?? "",
    categoria_destaque: ctx.categoryName ?? "",
    cupao_codigo: ctx.couponCode ?? "",
    desconto: ctx.couponDiscount ?? "10%",
    carimbos_faltam: String(ctx.stampsRemaining ?? 2),
    link_menu: ctx.menuUrl ?? "/",
  };
}
