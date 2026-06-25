import { useEffect, useState } from "react";
import {
  loadSavedMesaToken,
  saveSavedMesaToken,
  clearSavedMesaToken,
  clearSavedMesaSessionId,
  saveSavedMesaSessionId,
  loadSavedMesaSessionId,
  clearMesaBindingStorage,
} from "@/lib/customerSession";
import {
  openTableSessionOnScan,
  fetchPublicTableBinding,
  resolveTableByQrToken,
} from "@/services/tableSessionService";

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

async function syncTableSession(storeId: string, token: string, fromUrl: boolean): Promise<"ok" | "closed" | "failed"> {
  const knownSessionId = loadSavedMesaSessionId();

  try {
    const binding = await fetchPublicTableBinding(storeId, token, knownSessionId);
    if (!binding.active) {
      if (binding.reason === "session_closed" || binding.reason === "no_open_session") {
        if (fromUrl && binding.reason === "no_open_session") {
          const opened = await openTableSessionOnScan(storeId, token);
          if (opened?.session_id) saveSavedMesaSessionId(opened.session_id);
          return "ok";
        }
        return "closed";
      }
      return "closed";
    }
    if (binding.session_id) saveSavedMesaSessionId(binding.session_id);
    return "ok";
  } catch {
    if (fromUrl) {
      try {
        const opened = await openTableSessionOnScan(storeId, token);
        if (opened?.session_id) saveSavedMesaSessionId(opened.session_id);
        return "ok";
      } catch {
        return "failed";
      }
    }
    return "failed";
  }
}

/** Valida sessão de mesa via token do QR code (?t=...). O número na URL é informativo, o token é obrigatório. */
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
      const resolved = await resolveTableByQrToken(storeId, token);

      if (!active) return;

      if (resolved) {
        const data = {
          id: resolved.table_id,
          number: resolved.table_number,
          qr_token: token,
        };

        if (tableHint && tableHint !== data.number) {
          clearMesaBindingStorage();
          setMesa(null);
          setLoading(false);
          return;
        }

        saveSavedMesaToken(token);
        const sessionResult = await syncTableSession(storeId, token, Boolean(fromUrl));

        if (!active) return;

        if (sessionResult === "closed" || (sessionResult === "failed" && !fromUrl)) {
          clearMesaBindingStorage();
          setMesa(null);
          setLoading(false);
          return;
        }

        setMesa({
          mesaNumber: data.number,
          tableId: data.id,
          qrToken: token,
          locked: true,
          scanLang,
        });
      } else {
        clearMesaBindingStorage();
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
