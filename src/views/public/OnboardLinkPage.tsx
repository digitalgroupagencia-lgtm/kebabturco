import { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import { AlertCircle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { getStripePublishableKeyForEnvironment } from "@/lib/stripePublishableKey";
import { createPublicOnboardingSession } from "@/services/orderService";

function parseToken(pathname: string): string {
  const match = pathname.match(/\/ligar-conta\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-muted/30 px-4 py-8">
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex items-center gap-2">
        <Wallet className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-black">Ligar a sua conta</h1>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Preencha os dados da conta onde quer receber o dinheiro dos pedidos. É um formulário seguro de verificação e
        os dados ficam protegidos.
      </p>
      {children}
    </div>
  </div>
);

export default function OnboardLinkPage() {
  const location = useLocation();
  const token = useMemo(() => parseToken(location.pathname), [location.pathname]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const publishableKey = getStripePublishableKeyForEnvironment("live");

  const connectInstance = useMemo<StripeConnectInstance | null>(() => {
    if (!token || !publishableKey || loadError) return null;
    return loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret: async () => {
        try {
          const session = await createPublicOnboardingSession(token);
          return session.clientSecret;
        } catch (e) {
          setLoadError(e instanceof Error ? e.message : "Não foi possível abrir o formulário.");
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
  }, [token, publishableKey, loadError]);

  const onExit = useCallback(() => setDone(true), []);

  if (!token) {
    return (
      <Shell>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Link inválido. Peça um novo link.
        </div>
      </Shell>
    );
  }

  if (!publishableKey) {
    return (
      <Shell>
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          De momento não é possível abrir o formulário. Tente novamente mais tarde.
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-green-800 dark:text-green-300">Dados enviados</p>
            <p className="text-muted-foreground mt-1">
              Obrigado. Vamos verificar os dados e activar os seus recebimentos. Pode fechar esta página.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell>
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-900 dark:text-amber-200">Não foi possível abrir o formulário</p>
            <p className="text-muted-foreground mt-1">{loadError}</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (!connectInstance) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> A preparar o formulário…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="rounded-2xl border bg-card p-4">
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectAccountOnboarding onExit={onExit} />
        </ConnectComponentsProvider>
      </div>
    </Shell>
  );
}
