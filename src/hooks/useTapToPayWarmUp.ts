import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import {
  disconnectTapToPayReader,
  isTapToPayPlatform,
  warmUpTapToPayReader,
  type ReaderWarmUpStatus,
} from "@/lib/stripeTerminalService";

export function useTapToPayWarmUp(
  storeId: string | null | undefined,
  enabled = true,
  autoStart = true,
) {
  const [status, setStatus] = useState<ReaderWarmUpStatus>("idle");
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const busyRef = useRef(false);

  const runWarmUp = useCallback(async () => {
    if (!enabled || !storeId || !isTapToPayPlatform() || busyRef.current) return;
    const current = await getTapToPayReaderStatus();
    if (current.ready) {
      setStatus("ready");
      setErrorMessage(null);
      return;
    }
    busyRef.current = true;
    setStatus("preparing");
    setErrorMessage(null);
    try {
      const result = await warmUpTapToPayReader(storeId, {
        onProgress: (message) => setProgressMessage(message),
        onStatus: setStatus,
      });
      setStatus(result);
      if (result === "error") {
        setErrorMessage("Não foi possível preparar o Tap to Pay. Verifique a ligação e as definições da loja.");
      }
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "Erro ao preparar Tap to Pay.");
    } finally {
      busyRef.current = false;
    }
  }, [enabled, storeId]);

  useEffect(() => {
    if (!enabled || !storeId || !isTapToPayPlatform()) return;

    if (!autoStart) {
      void getTapToPayReaderStatus().then((current) => {
        setStatus(current.status);
        if (current.ready) setErrorMessage(null);
      });
      return;
    }

    void runWarmUp();

    let sub: { remove: () => void } | undefined;
    void CapApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      void getTapToPayReaderStatus().then((current) => {
        if (!current.ready) void runWarmUp();
      });
    }).then((s) => {
      sub = s;
    });

    return () => {
      sub?.remove();
      void disconnectTapToPayReader();
    };
  }, [enabled, storeId, autoStart, runWarmUp]);

  return {
    status,
    progressMessage,
    errorMessage,
    refreshWarmUp: runWarmUp,
    isPreparing: status === "preparing" || status === "discovering" || status === "connecting" || status === "updating",
    isReady: status === "ready",
    hasError: status === "error",
  };
}
