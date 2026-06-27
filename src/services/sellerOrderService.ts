import { supabase } from "@/integrations/supabase/client";

/** Cancela pedido do vendedor ainda sem pagamento (demo Tap to Pay / apagar rascunho). */
export async function cancelSellerPendingOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("payment_status", "pending");

  if (error) throw error;
}
