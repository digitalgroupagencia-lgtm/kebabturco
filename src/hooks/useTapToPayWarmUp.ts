import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import {
  disconnectTapToPayReader,
  isTapToPayPlatform,
  warmUpTapToPayReader,
  type ReaderWarmUpStatus,
} from "@/lib/stripeTerminalService";

export function useTapToPayWarmUp(storeId: string | null | undefined, enabled = true) {
  const [status, setStatus] = useState<ReaderWarmUpStatus>("idle");
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const busyRef = useRef(false);

  const runWarmUp = useCallback(async () => {
    if (!enabled || !storeId || !isTapToPayPlatform() || busyRef.current) return;
    busyRef.current = true;
    setStatus("preparing");
    try {
      const result = await warmUpTapToPayReader(storeId, {
        onProgress: (message) => setProgressMessage(message),
        onStatus: setStatus,
      });
      setStatus(result);
    } catch {
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }, [enabled, storeId]);

  useEffect(() => {
    if (!enabled || !storeId || !isTapToPayPlatform()) return;
    void runWarmUp();

    let sub: { remove: () => void } | undefined;
    void CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void runWarmUp();
    }).then((s) => {
      sub = s;
    });

    return () => {
      sub?.remove();
      void disconnectTapToPayReader();
    };
  }, [enabled, storeId, runWarmUp]);

  return {
    status,
    progressMessage,
    refreshWarmUp: runWarmUp,
    isPreparing: status === "preparing" || status === "discovering" || status === "connecting" || status === "updating",
    isReady: status === "ready",
  };
}
