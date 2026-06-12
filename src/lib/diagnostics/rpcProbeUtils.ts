import { extractErrorMessage } from "@/lib/extractErrorMessage";
import { supabase } from "@/integrations/supabase/client";

export type RpcProbeStatus = "missing" | "present" | "error";

export function isRpcMissingError(message: string | null | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("pgrst202") ||
    m.includes("could not find the function") ||
    m.includes("schema cache")
  );
}

/** RPC existe se o erro não for «função não encontrada». */
export async function probeRpc(
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: unknown | null }>,
  name: string,
  args: Record<string, unknown>,
): Promise<{ status: RpcProbeStatus; detail?: string }> {
  const { error } = await rpc(name, args);
  if (!error) return { status: "present" };
  const msg = extractErrorMessage(error);
  if (isRpcMissingError(msg)) return { status: "missing", detail: msg };
  return { status: "present", detail: msg };
}

const EDGE_HEALTH_PING: Record<string, Record<string, unknown>> = {
  "stripe-create-payment-intent": { ping: true },
  "stripe-connect-onboard": { ping: true },
  "print-order": { ping: true },
  "operational-diagnostics": { ping: true },
  "stripe-webhook": { ping: true },
  "send-push-notification": { probe: true },
};

function isEdgeReachableResponse(functionName: string, data: unknown, error: unknown): boolean {
  if (data && typeof data === "object") {
    const row = data as { ok?: boolean; service?: string; error?: string };
    if (row.ok === true) return true;
    if (row.service === functionName) return true;
    if ("configured" in row && row.service === "send-push-notification") return true;
    // Auth-required functions still prove deploy (e.g. operational-diagnostics).
    if (
      row.error === "Autenticação necessária" ||
      row.error === "Sessão expirada — faça login novamente." ||
      row.error === "Sessão inválida — faça login novamente."
    ) {
      return true;
    }
  }
  if (error) {
    const msg = extractErrorMessage(error).toLowerCase();
    if (msg.includes("404") || msg.includes("not found") || msg.includes("function not found")) {
      return false;
    }
    // Non-2xx with a body usually means the function exists.
    return true;
  }
  return false;
}

export async function probeEdgeFunctionReachable(
  functionName: string,
): Promise<{ reachable: boolean; status: number }> {
  const pingBody = EDGE_HEALTH_PING[functionName];
  if (pingBody) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body: pingBody });
      if (isEdgeReachableResponse(functionName, data, error)) {
        return { reachable: true, status: 200 };
      }
    } catch {
      /* fallback abaixo */
    }
  }

  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!base || !key) return { reachable: false, status: 0 };

  try {
    const res = await fetch(`${base}/functions/v1/${functionName}`, {
      method: "OPTIONS",
      headers: { apikey: key },
    });
    return { reachable: res.status !== 404, status: res.status };
  } catch {
    return { reachable: false, status: 0 };
  }
}
