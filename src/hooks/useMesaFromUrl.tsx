import { useEffect, useState } from "react";
import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import { loadSavedMesaToken, saveSavedMesaToken, clearSavedMesaToken } from "@/lib/customerSession";

export interface MesaFromUrl {
  mesaNumber: string;
  tableId: string;
  qrToken: string;
  locked: boolean;
}

/** Valida sessão de mesa via token do QR code (?t=...). */
export function useMesaFromUrl(storeId: string | null) {
  const [mesa, setMesa] = useState<MesaFromUrl | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const resolveToken = (): string | null => {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("t")?.trim();
      if (fromUrl) return fromUrl;
      return loadSavedMesaToken();
    };

    const token = resolveToken();

    if (!token || !storeId) {
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
        saveSavedMesaToken(token);
        setMesa({
          mesaNumber: data.number,
          tableId: data.id,
          qrToken: data.qr_token,
          locked: true,
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
  }, [storeId]);

  return { mesa, loading };
}
