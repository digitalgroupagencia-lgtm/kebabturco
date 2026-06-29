import { useEffect, useRef, useState } from "react";
import CustomerNotificationOptInDialog from "@/customer/components/CustomerNotificationOptInDialog";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { shouldPromptStaffPush } from "@/lib/staffPush";

/** Pede activação de push da equipa na primeira visita ao painel admin ou restaurante. */
const StaffPushPromptHost = () => {
  const { storeId, loading } = useAdminStoreId();
  const [open, setOpen] = useState(false);
  const promptedRef = useRef(false);

  useEffect(() => {
    if (loading || !storeId || promptedRef.current) return;
    if (!shouldPromptStaffPush()) return;
    promptedRef.current = true;
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [loading, storeId]);

  if (!storeId) return null;

  return (
    <CustomerNotificationOptInDialog
      open={open}
      storeId={storeId}
      audience="staff"
      onOpenChange={setOpen}
    />
  );
};

export default StaffPushPromptHost;
