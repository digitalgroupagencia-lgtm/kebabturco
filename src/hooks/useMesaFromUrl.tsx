import { useEffect, useState } from "react";
import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import { loadSavedMesaToken, saveSavedMesaToken, clearSavedMesaToken, saveSavedMesaSessionId, loadSavedMesaSessionId } from "@/lib/customerSession";
import { openTableSessionOnScan, fetchPublicTableBinding } from "@/services/tableSessionService";

export interface MesaFromUrl {
  mesaNumber: string;
  tableId: string;
  qrToken: string;
  locked: boolean;
  scanLang: string | null;
}

function readUrlSearch(): string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

/** Valida sessão de mesa via token do QR code (?t=...). O número na URL é informativo — o token é obrigatório. */
export function useMesaFromUrl(storeId: string | null) {
  const [mesa, setMesa] = useState<MesaFromUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchKey, setSearchKey] = useState(readUrlSearch);

  useEffect(() => {
    const sync = () => setSearchKey(readUrlSearch());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams(searchKey);
    const mode = params.get("mode")?.trim().toLowerCase();
    const tableHint = params.get("table")?.trim() || null;
    const scanLang = params.get("lang")?.trim() || null;
    const fromUrl = params.get("t")?.trim();
    const token = fromUrl || loadSavedMesaToken();

    // mode=table sem token válido nunca activa mesa (evita escolha manual por URL)
    if (!token || !storeId) {
      if (mode === "table" && tableHint && !fromUrl) {
        clearSavedMesaToken();
      }
      setMesa(null);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tables")
        .select("id, number, is_active, qr_token")
        .eq("store_id", storeId)
        .eq("qr_token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (!active) return;

      if (data) {
        if (tableHint && tableHint !== data.number) {
          clearSavedMesaToken();
          setMesa(null);
          setLoading(false);
          return;
        }
        saveSavedMesaToken(token);
        if (fromUrl) {
          try {
            const opened = await openTableSessionOnScan(storeId, token);
            if (opened?.session_id) saveSavedMesaSessionId(opened.session_id);
          } catch {
            /* rede — sessão abre no próximo pedido ou nova leitura do QR */
          }
        } else {
          try {
            const binding = await fetchPublicTableBinding(
              storeId,
              token,
              loadSavedMesaSessionId(),
            );
            if (!binding.active) {
              clearSavedMesaToken();
              setMesa(null);
              setLoading(false);
              return;
            }
            if (binding.session_id) saveSavedMesaSessionId(binding.session_id);
          } catch {
            /* mantém vínculo local se rede falhar */
          }
        }
        setMesa({
          mesaNumber: data.number,
          tableId: data.id,
          qrToken: data.qr_token,
          locked: true,
          scanLang,
        });
      } else {
        clearSavedMesaToken();
        setMesa(null);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [storeId, searchKey]);

  return { mesa, loading };
}
