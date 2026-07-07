import { supabase } from "@/integrations/supabase/client";
import { getDeviceLocaleTag } from "@/lib/deviceLocale";
import { CUSTOMER_MARKETING_PUSH_TAG } from "@/lib/customerMarketingPush";
import { STAFF_PUSH_TAG } from "@/lib/staffPush";

const WELCOME_SENT_PREFIX = "customer-welcome-push-sent:";

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
  customerName?: string | null,
  storeName?: string | null,
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

  const { error } = await supabase.functions.invoke("send-push-notification", {
    body: {
      storeId,
      audience: "marketing",
      customerPhone,
      welcomeCustomerName: customerName?.trim() || null,
      welcomeStoreName: storeName?.trim() || null,
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
