import { useEffect } from "react";
import {
  clearMesaBindingStorage,
  loadSavedMesaSessionId,
  saveSavedMesaSessionId,
} from "@/lib/customerSession";
import { fetchPublicTableBinding } from "@/services/tableSessionService";

/** Mantém vínculo QR↔mesa enquanto a sessão estiver aberta; desvincula quando o restaurante fecha a conta. */
export function useTableSessionBinding(
  storeId: string,
  qrToken: string | null,
  mesaLocked: boolean,
  onSessionClosed: () => void,
) {
  useEffect(() => {
    if (!storeId || !qrToken || !mesaLocked) return;

    let cancelled = false;

    const check = async () => {
      try {
        const knownSessionId = loadSavedMesaSessionId();
        const binding = await fetchPublicTableBinding(storeId, qrToken, knownSessionId);
        if (cancelled) return;

        if (!binding.active) {
          clearMesaBindingStorage();
          onSessionClosed();
          return;
        }

        if (binding.session_id) {
          saveSavedMesaSessionId(binding.session_id);
        }
      } catch {
        /* rede temporária — mantém vínculo local */
      }
    };

    void check();
    const timer = window.setInterval(check, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [storeId, qrToken, mesaLocked, onSessionClosed]);
}
