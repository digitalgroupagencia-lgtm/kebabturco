export type StoreCustomerContact = {
  store_id: string;
  name: string;
  phone: string | null;
  phone_secondary: string | null;
  whatsapp_phone: string | null;
};

/** Só dígitos — para links tel: e wa.me */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** E.164 Espanha (+34) quando o número tem 9 dígitos. */
export function toSpainE164(phone: string): string {
  const d = digitsOnly(phone);
  if (d.startsWith("34") && d.length >= 11) return `+${d}`;
  if (d.length === 9) return `+34${d}`;
  if (d.startsWith("00")) return `+${d.slice(2)}`;
  return d.startsWith("+") ? d : `+${d}`;
}

export function telHref(phone: string): string {
  return `tel:${toSpainE164(phone)}`;
}

export function whatsappHref(phone: string, message?: string): string {
  const e164 = digitsOnly(toSpainE164(phone));
  const base = `https://wa.me/${e164}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function formatDisplayPhone(phone: string): string {
  const d = digitsOnly(phone);
  if (d.length === 9) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  return phone;
}

export const CUSTOMER_ORDER_DELAY_WARN_MS = 10 * 60 * 1000;

export function isOrderDelayedPending(status: string, createdAt: string, now = Date.now()): boolean {
  if (status !== "pending") return false;
  return now - new Date(createdAt).getTime() >= CUSTOMER_ORDER_DELAY_WARN_MS;
}
