import {
  normalizeLocale,
  pickI18n,
  sanitizeNotificationText,
  type MessageLocale,
} from "./campaignTemplateEngine.ts";

export type StaffOrderPushItem = {
  quantity: number;
  product_name: string;
};

const NEW_ORDER_TITLE: Record<MessageLocale, (orderNumber: string) => string> = {
  pt: (n) => `Novo pedido #${n}`,
  es: (n) => `Nuevo pedido #${n}`,
  en: (n) => `New order #${n}`,
};

const MODALITY: Record<MessageLocale, Record<"delivery" | "takeaway" | "dine_in", string>> = {
  pt: { delivery: "Entrega", takeaway: "Balcão", dine_in: "Mesa" },
  es: { delivery: "Domicilio", takeaway: "Mostrador", dine_in: "Mesa" },
  en: { delivery: "Delivery", takeaway: "Counter", dine_in: "Table" },
};

const OPEN_PANEL: Record<MessageLocale, string> = {
  pt: "Abre o painel para ver detalhes",
  es: "Abre el panel para ver detalles",
  en: "Open the panel for details",
};

function formatOrderNumber(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(4, "0");
  return trimmed;
}

export function formatStaffOrderPrice(total: number, locale: MessageLocale): string {
  const code = locale === "en" ? "en-GB" : locale === "pt" ? "pt-PT" : "es-ES";
  return new Intl.NumberFormat(code, { style: "currency", currency: "EUR" }).format(total);
}

function itemDisplayName(raw: string, locale: MessageLocale): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      return pickI18n(parsed, locale, trimmed);
    }
  } catch {
    /* plain product name */
  }
  return trimmed;
}

export function summarizeStaffOrderItems(
  items: StaffOrderPushItem[],
  locale: MessageLocale,
  max = 2,
): string {
  if (!items.length) return "";
  const parts = items.slice(0, max).map((it) => {
    const name = itemDisplayName(it.product_name, locale);
    const short = name.length > 18 ? `${name.slice(0, 16)}…` : name;
    return `${it.quantity}× ${short}`;
  });
  const extra = items.length > max ? ` +${items.length - max}` : "";
  return parts.join(", ") + extra;
}

export function staffOrderModalityLabel(
  orderType: string | null | undefined,
  tableNumber: string | null | undefined,
  locale: MessageLocale,
): string {
  const type = (orderType ?? "takeaway").toLowerCase();
  if (type === "dine_in") {
    const base = MODALITY[locale].dine_in;
    const table = tableNumber?.trim();
    return table ? `${base} ${table}` : base;
  }
  if (type === "delivery") return MODALITY[locale].delivery;
  return MODALITY[locale].takeaway;
}

export function buildStaffNewOrderPush(params: {
  locale: string | null | undefined;
  orderNumber: string;
  total: number;
  orderType: string | null | undefined;
  tableNumber: string | null | undefined;
  items: StaffOrderPushItem[];
}): { title: string; body: string } {
  const locale = normalizeLocale(params.locale);
  const orderNumber = formatOrderNumber(params.orderNumber);
  const title = sanitizeNotificationText(NEW_ORDER_TITLE[locale](orderNumber));

  const price = formatStaffOrderPrice(Number(params.total) || 0, locale);
  const modality = staffOrderModalityLabel(params.orderType, params.tableNumber, locale);
  const summary = summarizeStaffOrderItems(params.items, locale);

  const segments = [price, modality];
  if (summary) segments.push(summary);
  else segments.push(OPEN_PANEL[locale]);

  const body = sanitizeNotificationText(segments.join(", "));
  return { title, body };
}
