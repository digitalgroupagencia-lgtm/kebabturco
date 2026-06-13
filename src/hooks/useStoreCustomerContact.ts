import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StoreCustomerContact } from "@/lib/storeCustomerContact";

export function useStoreCustomerContact(storeId: string | undefined) {
  const [contact, setContact] = useState<StoreCustomerContact | null>(null);
  const [loading, setLoading] = useState(Boolean(storeId));

  const load = useCallback(async () => {
    if (!storeId) {
      setContact(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_store_customer_contact", {
      _store_id: storeId,
    });
    if (!error && data && typeof data === "object") {
      setContact(data as StoreCustomerContact);
    } else {
      setContact(null);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { contact, loading, refresh: load };
}
