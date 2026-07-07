/**
 * Badge com hash do commit + build ID.
 * Toca uma vez para expandir e ver o build ID completo — útil para confirmar
 * no telemóvel nativo qual versão está a correr.
 */
import { useState } from "react";

const GIT_SHA = typeof __GIT_SHA__ !== "undefined" ? __GIT_SHA__ : "dev";
const BUILD_ID = typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "local";

export default function BuildVersionBadge() {
  const [expanded, setExpanded] = useState(false);

  const buildDate = (() => {
    const n = Number(BUILD_ID);
    if (!Number.isFinite(n) || n < 1_000_000_000_000) return null;
    try {
      return new Date(n).toLocaleString();
    } catch {
      return null;
    }
  })();

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:bg-muted transition-colors"
      title="Toca para ver detalhes do build"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
      <span>v:{GIT_SHA}</span>
      {expanded && (
        <span className="ml-1 text-[9px] opacity-70">
          {buildDate ?? BUILD_ID}
        </span>
      )}
    </button>
  );
}
