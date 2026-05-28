import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEscPosTicket, type TicketOrder } from "../_shared/escPosTicketBuilder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtraLine { name: string; quantity: number; price: number }
interface ItemLine {
  productName: string;
  quantity: number;
  size?: string | null;
  unitPrice: number;
  totalPrice: number;
  extras: ExtraLine[];
  removed: string[];
}

interface Payload {
  storeId: string;
  orderId?: string;
  orderNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  tableNumber?: string | null;
  orderType: "here" | "takeaway" | "delivery";
  paymentMethod: string;
  paymentPending: boolean;
  paidViaApp?: boolean;
  notes?: string | null;
  deliveryAddress?: string | null;
  items: ItemLine[];
  total: number;
}

function payloadToTicket(p: Payload, brandName: string, orderId: string): TicketOrder {
  const orderType =
    p.orderType === "here" ? "dine_in" : p.orderType === "delivery" ? "delivery" : "takeaway";

  return {
    id: orderId,
    order_number: p.orderNumber,
    customer_name: p.customerName ?? undefined,
    order_type: orderType,
    table_number: p.tableNumber,
    address: p.deliveryAddress,
    contact_phone: p.customerPhone,
    notes: p.notes,
    items: p.items.map((it) => ({
      name: it.productName,
      price: it.unitPrice,
      quantity: it.quantity,
      size: it.size,
      extras: it.extras?.map((e) => ({ name: e.name, price: e.price })),
      removed: it.removed,
    })),
    total: p.total,
    payment_method: p.paymentMethod,
    paid_via_app: p.paidViaApp ?? !p.paymentPending,
    company_name: brandName,
    created_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.storeId || !payload?.orderNumber || !Array.isArray(payload.items)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: recentOrder } = await supabase
      .from("orders")
      .select("id, created_at, payment_status, order_type, table_validated, kitchen_printed_at")
      .eq("store_id", payload.storeId)
      .eq("order_number", payload.orderNumber)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (!recentOrder) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado ou expirado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = payload.orderId || recentOrder.id;

    const readyForKitchen =
      recentOrder.payment_status === "paid" ||
      (recentOrder.order_type === "dine_in" && recentOrder.table_validated === true);

    if (!readyForKitchen) {
      return new Response(JSON.stringify({ skipped: true, reason: "awaiting_payment" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: printer } = await supabase
      .from("printer_settings")
      .select("enabled")
      .eq("store_id", payload.storeId)
      .maybeSingle();

    if (!printer?.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "printer disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("company_settings")
      .select("company_name")
      .eq("store_id", payload.storeId)
      .maybeSingle();

    const brand = company?.company_name || "Restaurante";
    const ticketBase64 = buildEscPosTicket(payloadToTicket(payload, brand, orderId));
    const copiesOverride = payload.orderType === "delivery" ? 2 : null;

    const { data: jobId, error: enqueueErr } = await supabase.rpc("enqueue_print_job", {
      _ticket_data: ticketBase64,
      _store_id: payload.storeId,
      _order_id: orderId,
      _copies_override: copiesOverride,
      _force_reprint: false,
    });

    if (enqueueErr) {
      return new Response(JSON.stringify({ error: enqueueErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, deprecated: true, jobId, via: "print_jobs" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
