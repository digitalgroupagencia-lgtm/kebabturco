import { supabase } from "@/integrations/supabase/client";

export type SupportMessage = {
  id: string;
  sender_role: "customer" | "staff";
  body: string;
  created_at: string;
};

export async function listSupportMessages(orderId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase.rpc("list_order_support_messages", { _order_id: orderId });
  if (error) throw error;
  return (data ?? []) as SupportMessage[];
}

export async function sendSupportMessage(opts: {
  orderId: string;
  senderRole: "customer" | "staff";
  body: string;
  customerPhone?: string;
}) {
  const { data, error } = await supabase.rpc("send_order_support_message", {
    _order_id: opts.orderId,
    _sender_role: opts.senderRole,
    _body: opts.body,
    _customer_phone: opts.customerPhone ?? null,
  });
  if (error) throw error;
  return data as string;
}
