import { handleVisitPrintBridgeRequest, visitBridgeCorsHeaders } from "../_shared/visitPrintBridgeApi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: visitBridgeCorsHeaders });
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, service: "visit-print-bridge-api" }), {
      headers: { ...visitBridgeCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const res = await handleVisitPrintBridgeRequest(req);
  if (res) return res;

  return new Response(JSON.stringify({ ok: false, error: "invalid_request" }), {
    status: 400,
    headers: { ...visitBridgeCorsHeaders, "Content-Type": "application/json" },
  });
});
