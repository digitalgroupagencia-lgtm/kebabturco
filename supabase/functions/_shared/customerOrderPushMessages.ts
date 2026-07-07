import {
  normalizeLocale,
  sanitizeNotificationText,
  type MessageLocale,
} from "./campaignTemplateEngine.ts";

export type CustomerOrderPushContext = {
  orderNumber: string;
  customerName: string | null;
  storeName: string | null;
  whatsappPhone: string | null;
  orderType: string | null;
  deliveryCode: string | null;
};

export type CustomerOrderPushEvent =
  | "pending"
  | "payment_paid"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "collected"
  | "served"
  | "cancelled";

function formatOrderNumber(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(4, "0");
  return trimmed;
}

function firstName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? "";
}

function namePrefix(name: string, locale: MessageLocale): string {
  if (!name) return "";
  return `${name}, `;
}

const TRACK_CTA: Record<MessageLocale, string> = {
  pt: "Acompanha em tempo real — toca aqui",
  es: "Síguelo en tiempo real — pulsa aquí",
  en: "Track it live — tap here",
};

function buildTrackingBody(
  locale: MessageLocale,
  prefix: string,
  core: string,
): string {
  return sanitizeNotificationText(`${prefix}${core} ${TRACK_CTA[locale]}`);
}

export function customerOrderPushUrl(
  orderId: string,
  event: CustomerOrderPushEvent,
  whatsappPhone: string | null,
): string {
  if (event === "cancelled" && whatsappPhone?.trim()) {
    const digits = whatsappPhone.replace(/\D/g, "");
    const e164 = digits.startsWith("34") ? digits : digits.length === 9 ? `34${digits}` : digits;
    return `https://wa.me/${e164}`;
  }
  return `/?screen=tracking&order=${orderId}`;
}

export function buildCustomerOrderPush(params: {
  locale: string | null | undefined;
  event: CustomerOrderPushEvent;
  context: CustomerOrderPushContext;
}): { title: string; body: string } {
  const locale = normalizeLocale(params.locale);
  const orderNumber = formatOrderNumber(params.context.orderNumber);
  const name = firstName(params.context.customerName);
  const prefix = namePrefix(name, locale);
  const num = `#${orderNumber}`;

  const title = sanitizeNotificationText(
    locale === "pt"
      ? `Pedido ${num}`
      : locale === "es"
        ? `Pedido ${num}`
        : `Order ${num}`,
  );

  let body: string;

  switch (params.event) {
    case "pending":
      body =
        locale === "pt"
          ? buildTrackingBody(locale, prefix, `recebemos o teu pedido ${num}.`)
          : locale === "es"
            ? buildTrackingBody(locale, prefix, `hemos recibido tu pedido ${num}.`)
            : buildTrackingBody(locale, prefix, `we received your order ${num}.`);
      break;
    case "payment_paid":
      body =
        locale === "pt"
          ? buildTrackingBody(locale, prefix, `pagamento confirmado no pedido ${num}.`)
          : locale === "es"
            ? buildTrackingBody(locale, prefix, `pago confirmado en el pedido ${num}.`)
            : buildTrackingBody(locale, prefix, `payment confirmed for order ${num}.`);
      break;
    case "preparing":
      body =
        locale === "pt"
          ? buildTrackingBody(locale, prefix, `o teu pedido ${num} está a ser preparado.`)
          : locale === "es"
            ? buildTrackingBody(locale, prefix, `tu pedido ${num} está en preparación.`)
            : buildTrackingBody(locale, prefix, `your order ${num} is being prepared.`);
      break;
    case "ready": {
      let core =
        locale === "pt"
          ? `o teu pedido ${num} está pronto!`
          : locale === "es"
            ? `¡tu pedido ${num} está listo!`
            : `your order ${num} is ready!`;
      const code = params.context.deliveryCode?.trim();
      if (code && params.context.orderType === "delivery") {
        core +=
          locale === "pt"
            ? ` Código de entrega: ${code}.`
            : locale === "es"
              ? ` Código de entrega: ${code}.`
              : ` Delivery code: ${code}.`;
      }
      body = buildTrackingBody(locale, prefix, core);
      break;
    }
    case "out_for_delivery": {
      let core =
        locale === "pt"
          ? `o teu pedido ${num} saiu para entrega!`
          : locale === "es"
            ? `¡tu pedido ${num} salió para entrega!`
            : `your order ${num} is on the way!`;
      const code = params.context.deliveryCode?.trim();
      if (code) {
        core +=
          locale === "pt"
            ? ` Código: ${code}.`
            : locale === "es"
              ? ` Código: ${code}.`
              : ` Code: ${code}.`;
      }
      body = buildTrackingBody(locale, prefix, core);
      break;
    }
    case "delivered":
      body = sanitizeNotificationText(
        locale === "pt"
          ? `${prefix}pedido ${num} entregue. Bom apetite!`
          : locale === "es"
            ? `${prefix}pedido ${num} entregado. ¡Buen provecho!`
            : `${prefix}order ${num} delivered. Enjoy!`,
      );
      break;
    case "collected":
      body = sanitizeNotificationText(
        locale === "pt"
          ? `${prefix}pedido ${num} recolhido. Bom apetite!`
          : locale === "es"
            ? `${prefix}pedido ${num} recogido. ¡Buen provecho!`
            : `${prefix}order ${num} collected. Enjoy!`,
      );
      break;
    case "served":
      body = sanitizeNotificationText(
        locale === "pt"
          ? `${prefix}pedido ${num} servido na mesa. Bom apetite!`
          : locale === "es"
            ? `${prefix}pedido ${num} servido en mesa. ¡Buen provecho!`
            : `${prefix}order ${num} served. Enjoy!`,
      );
      break;
    case "cancelled":
      body = sanitizeNotificationText(
        locale === "pt"
          ? `${prefix}lamentamos, o teu pedido ${num} foi cancelado. Se precisares de ajuda, fala connosco no WhatsApp.`
          : locale === "es"
            ? `${prefix}lo sentimos, tu pedido ${num} fue cancelado. Si necesitas ayuda, escríbenos por WhatsApp.`
            : `${prefix}sorry, your order ${num} was cancelled. Contact us on WhatsApp if you need help.`,
      );
      break;
    default:
      body = buildTrackingBody(
        locale,
        prefix,
        locale === "pt"
          ? `há uma actualização no pedido ${num}.`
          : locale === "es"
            ? `hay una actualización en el pedido ${num}.`
            : `there is an update on order ${num}.`,
      );
  }

  return { title, body };
}

export function buildCustomerWelcomePush(params: {
  locale: string | null | undefined;
  customerName: string | null;
  storeName: string | null;
}): { title: string; body: string } {
  const locale = normalizeLocale(params.locale);
  const name = firstName(params.customerName);
  const prefix = namePrefix(name, locale);
  const store = params.storeName?.trim() || (locale === "es" ? "o restaurante" : locale === "pt" ? "o restaurante" : "the restaurant");

  const title = sanitizeNotificationText(
    locale === "pt"
      ? "Bem-vindo à família!"
      : locale === "es"
        ? "¡Bienvenido a la familia!"
        : "Welcome to the family!",
  );

  const body = sanitizeNotificationText(
    locale === "pt"
      ? `${prefix}obrigado pelo teu primeiro pedido em ${store}. Acompanha os próximos pedidos em tempo real no menu.`
      : locale === "es"
        ? `${prefix}gracias por tu primer pedido en ${store}. Sigue tus próximos pedidos en tiempo real desde el menú.`
        : `${prefix}thanks for your first order at ${store}. Track your next orders live from the menu.`,
  );

  return { title, body };
}
