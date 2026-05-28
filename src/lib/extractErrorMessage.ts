/** Extrai texto legível de erros do browser, Supabase ou rede. */
export function extractErrorMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err.trim();
  if (err instanceof Error) return err.message.trim();

  if (typeof err === "object") {
    const record = err as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.error_description]
      .filter((part) => typeof part === "string" && part.trim())
      .map((part) => String(part).trim());
    if (parts.length > 0) return parts.join(" — ");
  }

  return String(err);
}
