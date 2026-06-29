import { useEffect, useRef, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import CustomerNotificationOptInDialog from "@/customer/components/CustomerNotificationOptInDialog";
import {
  isCustomerMarketingPushSupportedAsync,
  shouldPromptCustomerMarketingPush,
} from "@/lib/customerMarketingPush";

const PROMPT_SCREENS = new Set(["orderType"]);

/** Pede activação de push marketing uma vez por sessão, ao entrar no fluxo cliente. */
const CustomerPushPromptHost = () => {
  const { screen } = useOrder();
  const { storeId, selectedStoreId, loading } = useResolvedStore();
  const activeStoreId = selectedStoreId || storeId || "";
  const [open, setOpen] = useState(false);
  const promptedRef = useRef(false);

  useEffect(() => {
    if (loading || !activeStoreId || promptedRef.current) return;
    if (!PROMPT_SCREENS.has(screen)) return;
    if (!shouldPromptCustomerMarketingPush()) return;

    let timer = 0;
    let cancelled = false;

    void isCustomerMarketingPushSupportedAsync().then((supported) => {
      if (cancelled || !supported || promptedRef.current) return;
      promptedRef.current = true;
      timer = window.setTimeout(() => setOpen(true), 1200);
    });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [loading, activeStoreId, screen]);

  if (!activeStoreId) return null;

  return (
    <CustomerNotificationOptInDialog
      open={open}
      storeId={activeStoreId}
      onOpenChange={setOpen}
    />
  );
};

export default CustomerPushPromptHost;
