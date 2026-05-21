import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BIPEvent | null = null;
const listeners = new Set<(e: BIPEvent | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    listeners.forEach((l) => l(deferred));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l(null));
  });
}

export function useInstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(deferred);

  useEffect(() => {
    const cb = (e: BIPEvent | null) => setEvt(e);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(ua);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  const promptInstall = async () => {
    if (!evt) return "unavailable" as const;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") {
      deferred = null;
      listeners.forEach((l) => l(null));
    }
    return outcome;
  };

  return {
    canInstall: !!evt,
    isIOS,
    isAndroid,
    isStandalone,
    promptInstall,
  };
}
