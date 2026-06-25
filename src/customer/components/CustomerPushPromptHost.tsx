import { useEffect, useRef, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import CustomerNotificationOptInDialog from "@/customer/components/CustomerNotificationOptInDialog";
import {
  isCustomerMarketingPushSupported,
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
    if (!isCustomerMarketingPushSupported()) return;
    if (!shouldPromptCustomerMarketingPush()) return;
    promptedRef.current = true;
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
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
