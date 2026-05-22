import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

function CheckoutForm({ amountLabel, onSuccess, onCancel }: {
  amountLabel: string;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
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
    <div className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {err && <p className="text-sm font-bold text-destructive">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 h-12 rounded-2xl border border-border font-bold text-muted-foreground"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={pay}
          disabled={!stripe || busy}
          className="flex-[2] h-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pagar ${amountLabel}`}
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
      <CheckoutForm {...props} />
    </Elements>
  );
}
