import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

function CheckoutForm({ amountLabel, onSuccess, onCancel, compact }: {
  amountLabel: string;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
  compact?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pay = async () => {
    if (!stripe || !elements || busy) return;
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
      <PaymentElement options={{ layout: compact ? "accordion" : "tabs" }} />
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
          disabled={!stripe || busy}
          className={`flex-[2] rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center gap-2 ${compact ? "h-10 text-sm" : "h-12 rounded-2xl"}`}
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
}) {
  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    return (
      <p className="text-sm text-destructive font-bold p-4 bg-destructive/10 rounded-2xl">
        Pagamento online não configurado (VITE_STRIPE_PUBLISHABLE_KEY).
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: props.clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#D62300" } } }}>
      <CheckoutForm amountLabel={props.amountLabel} onSuccess={props.onSuccess} onCancel={props.onCancel} compact={props.compact} />
    </Elements>
  );
}
