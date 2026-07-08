import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { nav } from "@/lib/navPaths.ts";
import { waitForCapacitorNative } from "@/lib/capacitorRuntime";
import { isNativeIOSApp } from "@/lib/nativeAppPlatform";
import {
  checkStaffLockScreenCardCount,
  describeLockScreenCardStatus,
  registerStaffLockScreenCard,
} from "@/services/staffLiveActivity";

type Props = {
  storeId: string;
};

/** Aviso visível no painel ao vivo quando o cartão ACEITAR ainda não está registado no iPhone. */
const PanelLockScreenCardBanner = ({ storeId }: Props) => {
  const navigate = useNavigate();
  const [iosNative, setIosNative] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "warn" | "error"; title: string; detail: string } | null>(
    null,
  );

  const refresh = useCallback(async () => {
    if (!storeId) return;
    const nextCount = await checkStaffLockScreenCardCount(storeId);
    setCount(nextCount);
    setStatus(describeLockScreenCardStatus({ count: nextCount }));
  }, [storeId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await waitForCapacitorNative(10_000);
      const native = await isNativeIOSApp();
      if (cancelled) return;
      setIosNative(native);
      if (native) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const runRegistration = async () => {
    setBusy(true);
    setStatus({
      tone: "warn",
      title: "A registar cartão no ecrã…",
      detail: "Não feche a app. Isto pode demorar até 25 segundos.",
    });
    try {
      const result = await registerStaffLockScreenCard(storeId, {
        onProgress: (message) => {
          setStatus({
            tone: "warn",
            title: "A registar cartão no ecrã…",
            detail: message,
          });
        },
      });
      const nextCount = result.registeredInDb ? 1 : await checkStaffLockScreenCardCount(storeId);
      setCount(nextCount);
      setStatus(describeLockScreenCardStatus({ count: nextCount, result }));
    } finally {
      setBusy(false);
    }
  };

  if (!iosNative || count === null || count > 0) return null;

  const tone = status?.tone ?? "warn";

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm space-y-3 ${
        tone === "ok"
          ? "border-emerald-500/40 bg-emerald-500/10"
          : tone === "error"
            ? "border-destructive/50 bg-destructive/10"
            : "border-amber-500/50 bg-amber-500/10"
      }`}
    >
      <div className="flex gap-2">
        {tone === "ok" ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div>
          <p className="font-semibold">{status?.title ?? "Cartão ACEITAR ainda não registado neste iPhone"}</p>
          <p className="text-xs mt-1 opacity-90">
            {status?.detail ??
              "Carregue em «Registar agora» e mantenha a app aberta. Só depois disso aparece o cartão grande no ecrã bloqueado."}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="button" size="sm" className="w-full sm:w-auto" disabled={busy} onClick={() => void runRegistration()}>
          <Smartphone className="h-4 w-4 mr-2" />
          {busy ? "A registar… não feche a app" : "Registar agora"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => navigate(`${nav.panel("settings")}#notif`)}
        >
          Abrir definições
        </Button>
      </div>
    </div>
  );
};

export default PanelLockScreenCardBanner;
