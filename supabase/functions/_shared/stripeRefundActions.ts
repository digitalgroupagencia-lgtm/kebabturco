import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./stripePaymentActions.ts";
import {
  pickStripeSecretForEnvironment,
  retrievePaymentIntentWithFallback,
} from "./stripeEnv.ts";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ONLINE_PAYMENT_METHODS = new Set(["card", "apple_pay", "google_pay", "bizum", "pix"]);

function isOnlinePaidOrder(order: {
  payment_status: string;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
}) {
  return (
    order.payment_status === "paid" &&
    Boolean(order.stripe_payment_intent_id) &&
    order.payment_method != null &&
    ONLINE_PAYMENT_METHODS.has(order.payment_method)
  );
}

async function assertStaffCanManageStore(
  req: Request,
  storeId: string,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, response: json({ error: "Autenticação necessária" }, 401) };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, response: json({ error: "Sessão inválida" }, 401) };
  }

  const service = createClient(supabaseUrl, serviceKey);
  const { data: roles } = await service
    .from("user_roles")
    .select("role, store_id")
    .eq("user_id", userData.user.id);

  const allowed = (roles ?? []).some((r) => {
    const role = r.role as string;
    if (role === "admin_master") return true;
    if (["restaurant_admin", "operator", "kitchen", "cashier"].includes(role)) {
      return !r.store_id || r.store_id === storeId;
    }
    return false;
  });

  if (!allowed) {
    return { ok: false, response: json({ error: "Sem permissão para cancelar pedidos" }, 403) };
  }

  return { ok: true, userId: userData.user.id };
}

export async function handleRefundOrder(
  req: Request,
  body: Record<string, unknown>,
): Promise<Response> {
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const storeId = typeof body.storeId === "string" ? body.storeId.trim() : "";
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 300)
      : "Pedido cancelado pelo restaurante";

  if (!orderId || !storeId) {
    return json({ error: "Parâmetros inválidos" }, 400);
  }

  const auth = await assertStaffCanManageStore(req, storeId);
  if (!auth.ok) return auth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(
      "id, store_id, order_number, status, payment_status, payment_method, stripe_payment_intent_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order || order.store_id !== storeId) {
    return json({ error: "Pedido não encontrado" }, 404);
  }

  if (order.payment_status === "refunded") {
    return json({
      success: true,
      alreadyRefunded: true,
      orderId,
      orderNumber: order.order_number,
      refundMode: "none",
    });
  }

  if (order.status === "cancelled" && order.payment_status !== "paid") {
    return json({
      success: true,
      alreadyCancelled: true,
      orderId,
      orderNumber: order.order_number,
      refundMode: "none",
    });
  }

  const onlinePaid = isOnlinePaidOrder(order);
  let refundMode: "stripe" | "manual_cash" | "none" = "none";
  let stripeRefundId: string | null = null;

  if (onlinePaid && order.stripe_payment_intent_id) {
    const { data: store } = await supabase
      .from("stores")
      .select("stripe_connect_environment, stripe_connect_test_simulated")
      .eq("id", storeId)
      .maybeSingle();

    const testSimulated = Boolean(store?.stripe_connect_test_simulated);
    const connectEnv =
      store?.stripe_connect_environment === "test" || testSimulated ? "test" : "live";

    if (testSimulated) {
      refundMode = "stripe";
    } else {
      const stripeKey = pickStripeSecretForEnvironment(connectEnv);
      if (!stripeKey) {
        return json({ error: "Reembolso indisponível — Stripe não configurado" }, 503);
      }

      const { pi } = await retrievePaymentIntentWithFallback(
        order.stripe_payment_intent_id,
        connectEnv,
      );

      if (pi.status !== "succeeded") {
        return json({ error: "Pagamento ainda não estava confirmado no banco" }, 400);
      }

      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: {
          order_id: orderId,
          store_id: storeId,
          reason,
        },
      });
      stripeRefundId = refund.id;
      refundMode = "stripe";
    }

    const { data: refundRow, error: refundErr } = await supabase.rpc("record_order_refund", {
      _order_id: orderId,
      _reason: `Reembolso automático: ${reason}`,
    });

    if (refundErr) {
      console.error("[refund_order] record_order_refund failed", refundErr);
      return json({ error: "Reembolso no banco falhou após Stripe" }, 500);
    }

    return json({
      success: true,
      orderId,
      orderNumber: order.order_number,
      refundMode,
      stripeRefundId,
      refunded: true,
      record: refundRow,
    });
  }

  if (order.payment_status === "paid") {
    refundMode = "manual_cash";
  }

  const { error: cancelErr } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      notes: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (cancelErr) {
    return json({ error: cancelErr.message || "Erro ao cancelar" }, 500);
  }

  return json({
    success: true,
    orderId,
    orderNumber: order.order_number,
    refundMode,
    refunded: false,
    manualRefundRequired: refundMode === "manual_cash",
  });
}

export { corsHeaders };
