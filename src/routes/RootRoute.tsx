import { useEffect, useState, type ReactNode } from "react";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import PropioLanding from "@/pages/PropioLanding.tsx";
import PageSpinner from "@/components/PageSpinner";
import { dismissBootShell } from "@/lib/bootShell";
import { isLovableEditorPreview } from "@/lib/lovablePreview";

/**
 * Decide o conteúdo de "/":
 *  - se há ?tenant=, slug no path, ou host = custom_domain → renderiza a loja
 *  - caso contrário → landing neutra da PropioApp
 * Nunca cai automaticamente para o tenant template.
 */
export default function RootRoute({ tenantStore }: { tenantStore: ReactNode }) {
  const { tenantId, loading } = useResolvedStore();
  const [hasExplicitTenant] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.has("tenant")) return true;
    const seg = window.location.pathname.split("/").filter(Boolean)[0];
    return Boolean(seg);
  });

  useEffect(() => {
    dismissBootShell();
  }, []);

  // Preview Lovable em "/" sem tenant → landing imediata (evita ecrã branco).
  if (!hasExplicitTenant && isLovableEditorPreview()) {
    return <PropioLanding />;
  }

  // Se a URL pediu explicitamente um tenant, esperamos a resolução para
  // mostrar a loja (ou DomainNotConfiguredScreen do próprio Index).
  if (hasExplicitTenant) return <>{tenantStore}</>;

  if (loading) return <PageSpinner />;
  if (tenantId) return <>{tenantStore}</>;
  return <PropioLanding />;
}
