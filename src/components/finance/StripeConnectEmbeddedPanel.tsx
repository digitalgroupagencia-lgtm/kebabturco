import { useCallback, useMemo, useState } from "react";
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  ConnectDocuments,
  ConnectNotificationBanner,
  ConnectPayouts,
} from "@stripe/react-connect-js";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getStripePublishableKeyForEnvironment,
  type StripePublishableEnvironment,
} from "@/lib/stripePublishableKey";
import {
  createStripeConnectEmbeddedSession,
  provisionTestStripeConnect,
  syncStripeConnectStatus,
} from "@/services/orderService";

type Variant = "onboarding" | "management";

type Props = {
  storeId: string;
  variant: Variant;
  connectEnvironment?: StripePublishableEnvironment;
  productionBlocked?: boolean;
  onComplete?: () => void;
  onTestProvisioned?: (message: string) => void;
};

export default function StripeConnectEmbeddedPanel({
  storeId,
  variant,
  connectEnvironment = "live",
  productionBlocked = false,
  onComplete,
  onTestProvisioned,
}: Props) {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sessionEnvironment, setSessionEnvironment] = useState<StripePublishableEnvironment>(connectEnvironment);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useTestProvision, setUseTestProvision] = useState(false);
  const [testProvisionBusy, setTestProvisionBusy] = useState(false);
  const [alreadyConnected, setAlreadyConnected] = useState<string | null>(null);

  const sessionMode = variant === "onboarding" ? "embedded_onboarding" : "embedded_management";
  const preferTest = connectEnvironment === "test" || productionBlocked;

  const publishableKey = getStripePublishableKeyForEnvironment(sessionEnvironment);

  const finish = useCallback(async () => {
    setBusy(true);
    try {
      await syncStripeConnectStatus(storeId);
      onComplete?.();
    } finally {
      setBusy(false);
    }
  }, [storeId, onComplete]);

  const connectInstance = useMemo((): StripeConnectInstance | null => {
    if (loadError || useTestProvision || alreadyConnected) return null;
    const key = getStripePublishableKeyForEnvironment(sessionEnvironment);
    if (!key) return null;
    void refreshNonce;
    return loadConnectAndInitialize({
      publishableKey: key,
      fetchClientSecret: async () => {
        try {
          setLoadError(null);
          const session = await createStripeConnectEmbeddedSession(storeId, sessionMode);
          if (session.connectEnvironment) {
            setSessionEnvironment(session.connectEnvironment);
          }
          if (session.skipEmbedded) {
            setAlreadyConnected(
              session.message ||
                "Conta Connect do restaurante já registada — não precisa de formulário externo.",
            );
            throw new Error("SKIP_EMBEDDED");
          }
          if (!session.clientSecret) {
            throw new Error("Não foi possível abrir o formulário de verificação.");
          }
          return session.clientSecret;
        } catch (e) {
          const err = e as Error & { code?: string };
          if (err.message === "SKIP_EMBEDDED") {
            throw e;
          }
          const msg = err.message || "Não foi possível abrir o formulário de recebimentos.";
          setLoadError(msg);
          if (preferTest || err.code === "embedded_unavailable_use_test_provision") {
            setUseTestProvision(true);
          }
          throw e;
        }
      },
      appearance: {
        overlays: "dialog",
        variables: {
          fontFamily: "system-ui, -apple-system, sans-serif",
          borderRadius: "12px",
          colorPrimary: "#c2410c",
        },
      },
    });
  }, [sessionEnvironment, storeId, sessionMode, refreshNonce, loadError, useTestProvision, preferTest, alreadyConnected]);

  const activateTestReceivables = async () => {
    setTestProvisionBusy(true);
    try {
      const result = await provisionTestStripeConnect(storeId);
      setLoadError(null);
      setUseTestProvision(false);
      onTestProvisioned?.(result.message);
      onComplete?.();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao activar recebimentos de teste.");
    } finally {
      setTestProvisionBusy(false);
    }
  };

  const reloadSession = () => {
    setLoadError(null);
    setUseTestProvision(false);
    setRefreshNonce((n) => n + 1);
  };

  if (alreadyConnected) {
    return (
      <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 space-y-3">
        <p className="text-sm font-semibold text-green-800 dark:text-green-300 leading-relaxed">
          {alreadyConnected}
        </p>
        <Button type="button" className="w-full h-11 font-bold" disabled={busy} onClick={() => void finish()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Concluir
        </Button>
      </div>
    );
  }

  if (!publishableKey && preferTest && (loadError || useTestProvision || variant === "onboarding")) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
        <div className="flex gap-2 items-start">
          <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-black text-amber-900 dark:text-amber-200">
              Modo teste activo — conta simulada para validação do checkout
            </p>
            <p className="text-muted-foreground leading-relaxed">
              O formulário de verificação não está disponível neste momento. Pode activar recebimentos de validação
              com um clique — sem dinheiro real.
            </p>
            {loadError && (
              <p className="text-xs text-muted-foreground pt-1">{loadError}</p>
            )}
          </div>
        </div>
        <Button
          type="button"
          className="w-full h-11 font-black"
          disabled={testProvisionBusy}
          onClick={() => void activateTestReceivables()}
        >
          {testProvisionBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Activar recebimentos de teste
        </Button>
      </div>
    );
  }

  if (!publishableKey && !getStripePublishableKeyForEnvironment(sessionEnvironment)) {
    return (
      <div className="rounded-xl border border-dashed p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          {connectEnvironment === "test"
            ? "Modo teste indisponível — falta a chave publicável de teste no site. Pode ainda activar recebimentos de teste pelo botão abaixo."
            : "Recebimentos online indisponíveis neste momento."}
        </p>
        {preferTest && (
          <Button
            type="button"
            className="w-full h-11 font-black"
            disabled={testProvisionBusy}
            onClick={() => void activateTestReceivables()}
          >
            {testProvisionBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Activar recebimentos de teste
          </Button>
        )}
      </div>
    );
  }

  if (useTestProvision && preferTest) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Modo teste activo. Conta de recebimentos simulada para validação do checkout.
        </p>
        {loadError && <p className="text-xs text-muted-foreground">{loadError}</p>}
        <Button
          type="button"
          className="w-full h-11 font-black"
          disabled={testProvisionBusy}
          onClick={() => void activateTestReceivables()}
        >
          {testProvisionBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Activar recebimentos de teste
        </Button>
        <button type="button" onClick={reloadSession} className="text-xs text-primary font-semibold underline">
          Tentar formulário de verificação novamente
        </button>
      </div>
    );
  }

  if (!connectInstance) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> A preparar formulário…
      </div>
    );
  }

  return (
    <div className="relative space-y-3">
      {sessionEnvironment === "test" && (
        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-2">
          Modo teste — dados simulados, sem dinheiro real.
        </p>
      )}
      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
          {loadError}
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <ConnectComponentsProvider connectInstance={connectInstance}>
        {variant === "management" && (
          <ConnectNotificationBanner collectionOptions={{ fields: "currently_due", futureRequirements: "omit" }} />
        )}
        {variant === "onboarding" ? (
          <ConnectAccountOnboarding
            onExit={() => {
              void finish();
            }}
          />
        ) : (
          <div className="space-y-4">
            <ConnectAccountManagement collectionOptions={{ fields: "currently_due", futureRequirements: "omit" }} />
            <ConnectPayouts />
            <ConnectDocuments />
          </div>
        )}
      </ConnectComponentsProvider>
      {variant === "management" && (
        <button
          type="button"
          onClick={reloadSession}
          className="text-xs text-primary font-semibold underline"
        >
          Actualizar formulário
        </button>
      )}
    </div>
  );
}
