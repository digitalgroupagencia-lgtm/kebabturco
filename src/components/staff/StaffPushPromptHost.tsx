import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import StaffPushOptInDialog from "@/components/staff/StaffPushOptInDialog";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { shouldPromptStaffPushAsync } from "@/lib/push/pushPermissionSync";

/** Pede activação de push sempre que o painel abre sem notificações activas. */
const StaffPushPromptHost = () => {
  const { storeId, loading } = useAdminStoreId();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const checkSeq = useRef(0);

  const evaluatePrompt = useCallback(async () => {
    if (loading || !storeId) return;
    const seq = ++checkSeq.current;
    const shouldPrompt = await shouldPromptStaffPushAsync();
    if (seq !== checkSeq.current) return;
    if (shouldPrompt) {
      window.setTimeout(() => {
        if (seq === checkSeq.current) setOpen(true);
      }, 900);
    } else {
      setOpen(false);
    }
  }, [loading, storeId]);

  useEffect(() => {
    void evaluatePrompt();
  }, [evaluatePrompt, location.pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void evaluatePrompt();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [evaluatePrompt]);

  if (!storeId) return null;

  return (
    <StaffPushOptInDialog
      open={open}
      storeId={storeId}
      onOpenChange={setOpen}
    />
  );
};

export default StaffPushPromptHost;
