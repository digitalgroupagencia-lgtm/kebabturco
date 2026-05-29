import { extractErrorMessage } from "@/lib/extractErrorMessage";

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

export async function probeEdgeFunctionReachable(
  functionName: string,
): Promise<{ reachable: boolean; status: number }> {
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
