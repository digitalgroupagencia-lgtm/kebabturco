import { supabase } from "@/integrations/supabase/client";
import { getDeviceLocaleTag } from "@/lib/deviceLocale";
import { CUSTOMER_MARKETING_PUSH_TAG } from "@/lib/customerMarketingPush";
import { STAFF_PUSH_TAG } from "@/lib/staffPush";

const WELCOME_SENT_PREFIX = "customer-welcome-push-sent:";

type WelcomeCopy = { title: string; body: string };

function welcomeCopy(locale: string): WelcomeCopy {
  const lang = locale.toLowerCase().startsWith("pt") ? "pt" : locale.toLowerCase().startsWith("en") ? "en" : "es";
  if (lang === "pt") {
    return {
      title: "Bem-vindo à família!",
      body: "Obrigado pelo seu primeiro pedido. Voltamos a avisar com novidades e ofertas.",
    };
  }
  if (lang === "en") {
    return {
      title: "Welcome to the family!",
      body: "Thanks for your first order. We'll keep you posted with news and offers.",
    };
  }
  return {
    title: "¡Bienvenido a la familia!",
    body: "Gracias por tu primer pedido. Te avisaremos con novedades y ofertas.",
  };
}

function isRealCustomerPhone(phone: string | undefined | null): phone is string {
  const trimmed = phone?.trim();
  if (!trimmed) return false;
  if (trimmed === CUSTOMER_MARKETING_PUSH_TAG || trimmed === STAFF_PUSH_TAG) return false;
  if (trimmed.startsWith("__")) return false;
  return true;
}

function welcomeSentKey(storeId: string, phone: string): string {
  return `${WELCOME_SENT_PREFIX}${storeId}:${phone}`;
}

function markWelcomeSent(storeId: string, phone: string) {
  try {
    localStorage.setItem(welcomeSentKey(storeId, phone), "1");
  } catch {
    /* ignore */
  }
}

function wasWelcomeSent(storeId: string, phone: string): boolean {
  try {
    return localStorage.getItem(welcomeSentKey(storeId, phone)) === "1";
  } catch {
    return false;
  }
}

/** Envia boas-vindas imediatas após o primeiro pedido com telemóvel (se push já registado). */
export async function sendImmediateWelcomePushIfNeeded(
  storeId: string,
  customerPhone: string | undefined | null,
): Promise<void> {
  if (!storeId || !isRealCustomerPhone(customerPhone)) return;
  if (wasWelcomeSent(storeId, customerPhone)) return;

  const { count, error: countErr } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("customer_phone", customerPhone)
    .neq("status", "cancelled");

  if (countErr || (count ?? 0) > 1) return;

  const locale = getDeviceLocaleTag();
  const { title, body } = welcomeCopy(locale);

  const { error } = await supabase.functions.invoke("send-push-notification", {
    body: {
      storeId,
      audience: "marketing",
      customerPhone,
      title,
      body,
      tag: `welcome-${storeId}-${customerPhone}`,
      url: "/",
    },
  });

  if (error) {
    console.warn("[push] boas-vindas imediatas falharam:", error.message);
    return;
  }

  markWelcomeSent(storeId, customerPhone);
}
