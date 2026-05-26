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
import { Loader2 } from "lucide-react";
import {
  getStripePublishableKeyForEnvironment,
  type StripePublishableEnvironment,
} from "@/lib/stripePublishableKey";
import {
  createStripeConnectEmbeddedSession,
  syncStripeConnectStatus,
} from "@/services/orderService";

type Variant = "onboarding" | "management";

type Props = {
  storeId: string;
  variant: Variant;
  connectEnvironment?: StripePublishableEnvironment;
  onComplete?: () => void;
};

export default function StripeConnectEmbeddedPanel({
  storeId,
  variant,
  connectEnvironment = "live",
  onComplete,
}: Props) {
  const publishableKey = getStripePublishableKeyForEnvironment(connectEnvironment);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sessionEnvironment, setSessionEnvironment] = useState<StripePublishableEnvironment>(connectEnvironment);

  const sessionMode = variant === "onboarding" ? "embedded_onboarding" : "embedded_management";

  const connectInstance = useMemo((): StripeConnectInstance | null => {
    const key = getStripePublishableKeyForEnvironment(sessionEnvironment);
    if (!key) return null;
    void refreshNonce;
    return loadConnectAndInitialize({
      publishableKey: key,
      fetchClientSecret: async () => {
        const session = await createStripeConnectEmbeddedSession(storeId, sessionMode);
        if (session.connectEnvironment) {
          setSessionEnvironment(session.connectEnvironment);
        }
        return session.clientSecret;
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
  }, [sessionEnvironment, storeId, sessionMode, refreshNonce]);

  const finish = useCallback(async () => {
    setBusy(true);
    try {
      await syncStripeConnectStatus(storeId);
      onComplete?.();
    } finally {
      setBusy(false);
    }
  }, [storeId, onComplete]);

  const reloadSession = () => setRefreshNonce((n) => n + 1);

  if (!publishableKey && !getStripePublishableKeyForEnvironment(sessionEnvironment)) {
    return (
      <p className="text-sm text-muted-foreground p-4 border border-dashed rounded-xl">
        {connectEnvironment === "test"
          ? "Modo teste indisponível — falta a chave publicável de teste no site."
          : "Recebimentos online indisponíveis neste momento."}
      </p>
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
      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectNotificationBanner collectionOptions={{ fields: "currently_due", futureRequirements: "omit" }} />
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
