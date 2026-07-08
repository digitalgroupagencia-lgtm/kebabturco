const encoder = new TextEncoder();

function base64UrlEncode(data: Uint8Array): string {
  const bin = Array.from(data, (b) => String.fromCharCode(b)).join("");
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

export type LiveActivityAcceptPayload = {
  order_id: string;
  store_id: string;
  user_id: string;
  user_name: string;
  exp: number;
};

export function liveActivityAcceptSecret(): string {
  const explicit = (Deno.env.get("LIVE_ACTIVITY_ACCEPT_SECRET") ?? "").trim();
  if (explicit) return explicit;
  const service = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (!service) throw new Error("Missing LIVE_ACTIVITY_ACCEPT_SECRET");
  return service.slice(0, 64);
}

export async function issueLiveActivityAcceptToken(
  payload: Omit<LiveActivityAcceptPayload, "exp">,
  ttlSeconds = 7200,
): Promise<string> {
  const body: LiveActivityAcceptPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const json = JSON.stringify(body);
  const payloadPart = base64UrlEncode(encoder.encode(json));
  const sig = await hmacSign(liveActivityAcceptSecret(), payloadPart);
  return `${payloadPart}.${sig}`;
}

export async function verifyLiveActivityAcceptToken(
  token: string,
): Promise<LiveActivityAcceptPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadPart, sigPart] = parts;
  const expected = await hmacSign(liveActivityAcceptSecret(), payloadPart);
  if (expected !== sigPart) return null;
  try {
    const json = new TextDecoder().decode(base64UrlDecode(payloadPart));
    const body = JSON.parse(json) as LiveActivityAcceptPayload;
    if (!body.order_id || !body.store_id || !body.user_id) return null;
    if (body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch {
    return null;
  }
}
