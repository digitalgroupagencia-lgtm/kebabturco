import { supabase } from "@/integrations/supabase/client";

export async function markSellerOrderPaidCard(
  orderId: string,
  stripePaymentIntentId?: string | null,
) {
  const { data, error } = await supabase.rpc("mark_seller_order_paid", {
    _order_id: orderId,
    _payment_method: "card",
    _stripe_payment_intent_id: stripePaymentIntentId || undefined,
  });
  if (error) throw error;
  if (data && typeof data === "object" && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error);
  }
  return data;
}
