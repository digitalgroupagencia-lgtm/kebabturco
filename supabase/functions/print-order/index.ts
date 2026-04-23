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

const LOCALES: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};

const LABELS: Record<string, Record<string, string>> = {
  order: { pt: "PEDIDO", en: "ORDER", es: "PEDIDO", fr: "COMMANDE" },
  payCounter: {
    pt: "** PAGAR NO BALCAO **",
    en: "** PAY AT COUNTER **",
    es: "** PAGAR EN MOSTRADOR **",
    fr: "** PAYER AU COMPTOIR **",
  },
  type: { pt: "Tipo", en: "Type", es: "Tipo", fr: "Type" },
  here: { pt: "Comer aqui", en: "Eat here", es: "Comer aqui", fr: "Sur place" },
  takeaway: { pt: "Para levar", en: "Take away", es: "Para llevar", fr: "A emporter" },
  table: { pt: "Mesa", en: "Table", es: "Mesa", fr: "Table" },
  customer: { pt: "Cliente", en: "Customer", es: "Cliente", fr: "Client" },
  phone: { pt: "Tel", en: "Tel", es: "Tel", fr: "Tel" },
  payment: { pt: "Pago", en: "Pay", es: "Pago", fr: "Paie" },
  time: { pt: "Hora", en: "Time", es: "Hora", fr: "Heure" },
  total: { pt: "TOTAL", en: "TOTAL", es: "TOTAL", fr: "TOTAL" },
  notes: { pt: "Obs", en: "Notes", es: "Obs", fr: "Notes" },
  without: { pt: "sem", en: "no", es: "sin", fr: "sans" },
};

const buildTicket = (p: Payload, lang: string, brandName: string) => {
  const W = 32;
  const lines: string[] = [];
  const sep = "-".repeat(W);
  const dsep = "=".repeat(W);
  const L = (k: string) => LABELS[k]?.[lang] || LABELS[k]?.es || k;
  const locale = LOCALES[lang] || "es-ES";

  lines.push(center(brandName.toUpperCase(), W));
  lines.push(sep);
  lines.push(center(`${L("order")} #${p.orderNumber}`, W));
  lines.push(sep);

  if (p.paymentPending) {
    lines.push(center(L("payCounter"), W));
    lines.push(sep);
  }

  lines.push(`${L("type")}:  ${p.orderType === "here" ? L("here") : L("takeaway")}`);
  if (p.tableNumber) lines.push(`${L("table")}:  ${p.tableNumber}`);
  if (p.customerName) lines.push(`${L("customer")}: ${p.customerName}`);
  if (p.customerPhone) lines.push(`${L("phone")}: ${p.customerPhone}`);
  lines.push(`${L("payment")}:  ${p.paymentMethod}`);
  lines.push(`${L("time")}:  ${new Date().toLocaleString(locale)}`);
  lines.push(sep);

  for (const it of p.items) {
    lines.push(`${it.quantity}x ${it.productName}`);
    if (it.size) lines.push(`   Tam: ${it.size}`);
    for (const ex of it.extras) lines.push(`   + ${ex.quantity}x ${ex.name}`);
    for (const rm of it.removed) lines.push(`   - ${L("without")} ${rm}`);
    lines.push(`   ${it.totalPrice.toFixed(2)} EUR`);
  }

  lines.push(dsep);
  lines.push(`${L("total")}:  ${p.total.toFixed(2)} EUR`);
  lines.push(dsep);

  if (p.notes) {
    lines.push(`${L("notes")}:`);
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

    // Idioma principal e nome do projeto
    const [{ data: totem }, { data: company }] = await Promise.all([
      supabase
        .from("totem_config")
        .select("primary_language")
        .eq("store_id", payload.storeId)
        .maybeSingle(),
      supabase
        .from("company_settings")
        .select("company_name")
        .eq("store_id", payload.storeId)
        .maybeSingle(),
    ]);
    const lang = totem?.primary_language || "es";
    const brand = company?.company_name || "EL REY";

    const ticket = buildTicket(payload, lang, brand);

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