import { useCallback, useEffect, useRef, useState } from "react";
import { useOrder } from "@/contexts/OrderContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import CustomerNotificationOptInDialog from "@/customer/components/CustomerNotificationOptInDialog";
import { shouldPromptCustomerMarketingPushAsync } from "@/lib/push/pushPermissionSync";

/** Pede activação de notificações no menu cliente enquanto não estiverem activas. */
const CustomerPushPromptHost = () => {
  const { screen } = useOrder();
  const { storeId, selectedStoreId, loading } = useResolvedStore();
  const activeStoreId = selectedStoreId || storeId || "";
  const [open, setOpen] = useState(false);
  const checkSeq = useRef(0);

  const evaluatePrompt = useCallback(async () => {
    if (loading || !activeStoreId) return;
    const seq = ++checkSeq.current;
    const shouldPrompt = await shouldPromptCustomerMarketingPushAsync();
    if (seq !== checkSeq.current) return;
    if (shouldPrompt) {
      window.setTimeout(() => {
        if (seq === checkSeq.current) setOpen(true);
      }, 1200);
    } else {
      setOpen(false);
    }
  }, [loading, activeStoreId]);

  useEffect(() => {
    void evaluatePrompt();
  }, [evaluatePrompt, screen]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void evaluatePrompt();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [evaluatePrompt]);

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
