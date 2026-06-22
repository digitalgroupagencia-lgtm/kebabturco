/** Erros típicos quando a Edge Function não está deployada ou há falha de rede/CORS. */
export function isNetworkOrEdgeUnavailable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("fetch failed") ||
    m.includes("networkerror") ||
    m.includes("network request failed") ||
    m.includes("failed to send a request") ||
    m.includes("load failed") ||
    m.includes("functions/v1") ||
    m.includes("edge function") ||
    m.includes("err_connection") ||
    m.includes("cors") ||
    m.includes("404") ||
    m.includes("not found") ||
    m.includes("demorou demasiado")
  );
}
