import { useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import {
  getStripePublishableKeyForEnvironment,
  hasStripePublishableKey,
  type StripePublishableEnvironment,
} from "@/lib/stripePublishableKey";

const stripePromiseCache: Partial<Record<StripePublishableEnvironment, Promise<Stripe | null>>> = {};
const stripePromiseOverrideCache: Record<string, Promise<Stripe | null>> = {};

function getStripePromise(environment: StripePublishableEnvironment = "live", publishableKey?: string | null) {
  const key = publishableKey?.trim() || getStripePublishableKeyForEnvironment(environment);
  if (!key) return null;
  if (publishableKey) {
    stripePromiseOverrideCache[key] ||= loadStripe(key);
    return stripePromiseOverrideCache[key];
  }
  if (!stripePromiseCache[environment]) {
    stripePromiseCache[environment] = loadStripe(key);
  }
  return stripePromiseCache[environment]!;
}

function CheckoutForm({
  amountLabel,
  onSuccess,
  onCancel,
  compact,
}: {
  amountLabel: string;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
  compact?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pay = async () => {
    if (!stripe || !elements || busy || !ready) return;
    setBusy(true);
    setErr(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      setErr(error.message || "Pagamento recusado");
      setBusy(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      await onSuccess();
    }
    setBusy(false);
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <PaymentElement
        onReady={() => setReady(true)}
        options={{
          layout: compact ? "accordion" : "tabs",
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />
      {!ready && (
        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> A carregar formulário de pagamento…
        </div>
      )}
      {err && <p className="text-xs font-bold text-destructive">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={`flex-1 rounded-xl border border-border font-bold text-muted-foreground ${compact ? "h-10 text-sm" : "h-12 rounded-2xl"}`}
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={pay}
          disabled={!stripe || busy || !ready}
          className={`flex-[2] rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center gap-2 disabled:opacity-60 ${compact ? "h-10 text-sm" : "h-12 rounded-2xl"}`}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pagar ${amountLabel}`}
        </button>
      </div>
    </div>
  );
}

export default function StripePaymentForm(props: {
  clientSecret: string;
  amountLabel: string;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
  compact?: boolean;
  connectEnvironment?: StripePublishableEnvironment;
  publishableKey?: string | null;
}) {
  const environment = props.connectEnvironment ?? "live";
  const stripePromise = useMemo(
    () => getStripePromise(environment, props.publishableKey),
    [environment, props.publishableKey],
  );

  if ((!props.publishableKey && !hasStripePublishableKey(environment)) || !stripePromise) {
    return (
      <p className="text-sm text-destructive font-bold p-4 bg-destructive/10 rounded-2xl">
        Pagamento online ainda não está disponível neste site. Peça ao restaurante para activar os recebimentos.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: { theme: "stripe", variables: { colorPrimary: "#D62300" } },
      }}
    >
      <CheckoutForm
        amountLabel={props.amountLabel}
        onSuccess={props.onSuccess}
        onCancel={props.onCancel}
        compact={props.compact}
      />
    </Elements>
  );
}
