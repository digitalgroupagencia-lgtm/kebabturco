import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  orderNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  tableNumber?: string | null;
  orderType: "here" | "takeaway";
  paymentMethod: string;
  paymentPending: boolean;
  notes?: string | null;
  items: ItemLine[];
  total: number;
}

const center = (s: string, w = 32) => {
  const pad = Math.max(0, Math.floor((w - s.length) / 2));
  return " ".repeat(pad) + s;
};

const buildTicket = (p: Payload) => {
  const W = 32;
  const lines: string[] = [];
  const sep = "-".repeat(W);
  const dsep = "=".repeat(W);

  lines.push(center("EL REY", W));
  lines.push(sep);
  lines.push(center(`PEDIDO #${p.orderNumber}`, W));
  lines.push(sep);

  if (p.paymentPending) {
    lines.push(center("** PAGAR EN MOSTRADOR **", W));
    lines.push(sep);
  }

  lines.push(`Tipo:  ${p.orderType === "here" ? "Comer aqui" : "Para llevar"}`);
  if (p.tableNumber) lines.push(`Mesa:  ${p.tableNumber}`);
  if (p.customerName) lines.push(`Cliente: ${p.customerName}`);
  if (p.customerPhone) lines.push(`Tel: ${p.customerPhone}`);
  lines.push(`Pago:  ${p.paymentMethod}`);
  lines.push(`Hora:  ${new Date().toLocaleString("es-ES")}`);
  lines.push(sep);

  for (const it of p.items) {
    lines.push(`${it.quantity}x ${it.productName}`);
    if (it.size) lines.push(`   Tam: ${it.size}`);
    for (const ex of it.extras) lines.push(`   + ${ex.quantity}x ${ex.name}`);
    for (const rm of it.removed) lines.push(`   - sin ${rm}`);
    lines.push(`   ${it.totalPrice.toFixed(2)} EUR`);
  }

  lines.push(dsep);
  lines.push(`TOTAL:  ${p.total.toFixed(2)} EUR`);
  lines.push(dsep);

  if (p.notes) {
    lines.push("Obs:");
    lines.push(p.notes);
    lines.push(sep);
  }

  lines.push("");
  lines.push("");
  lines.push("");
  return lines.join("\n");
};

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

    const { data: printer } = await supabase
      .from("printer_settings")
      .select("*")
      .eq("store_id", payload.storeId)
      .maybeSingle();

    if (!printer || !printer.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "printer disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!printer.agent_endpoint) {
      return new Response(
        JSON.stringify({ error: "Agent endpoint not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ticket = buildTicket(payload);

    const agentResp = await fetch(`${printer.agent_endpoint.replace(/\/+$/, "")}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ip: printer.ip_address,
        port: printer.port ?? 9100,
        text: ticket,
      }),
    });

    const ok = agentResp.ok;
    const body = await agentResp.text().catch(() => "");

    await supabase
      .from("printer_settings")
      .update({ last_test_at: new Date().toISOString(), last_test_ok: ok })
      .eq("store_id", payload.storeId);

    return new Response(
      JSON.stringify({ ok, status: agentResp.status, body }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});