import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import {
  getStripePublishableKeyForEnvironment,
  hasStripePublishableKey,
  type StripePublishableEnvironment,
} from "@/lib/stripePublishableKey";
import {
  clearStripeRedirectParams,
  readStripeRedirectFromUrl,
} from "@/lib/stripeCheckoutSession";

export type StripeCheckoutMethod = "card" | "bizum";

const stripePromiseCache: Partial<Record<string, Promise<Stripe | null>>> = {};

function getStripePromise(environment: StripePublishableEnvironment = "live", publishableKey?: string | null) {
  const key = publishableKey?.startsWith("pk_") ? publishableKey : getStripePublishableKeyForEnvironment(environment);
  if (!key) return null;
  const cacheKey = `${environment}:${key}`;
  if (!stripePromiseCache[cacheKey]) {
    stripePromiseCache[cacheKey] = loadStripe(key);
  }
  return stripePromiseCache[cacheKey]!;
}

async function pollPaymentIntentUntilSettled(
  stripe: Stripe,
  clientSecret: string,
  maxAttempts = 45,
  intervalMs = 2000,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
    if (error) throw new Error(error.message || "Não foi possível verificar o pagamento");
    if (paymentIntent?.status === "succeeded") return paymentIntent;
    if (paymentIntent?.status === "canceled" || paymentIntent?.status === "requires_payment_method") {
      throw new Error("Pagamento cancelado ou recusado pelo banco");
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }
  }
  throw new Error(
    "O banco ainda não confirmou o pagamento. Não feche esta página — estamos a aguardar a confirmação.",
  );
}

function CheckoutForm({
  clientSecret,
  amountLabel,
  onSuccess,
  onCancel,
  onBusyChange,
  compact,
  checkoutMethod,
}: {
  clientSecret: string;
  amountLabel: string;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
  compact?: boolean;
  checkoutMethod: StripeCheckoutMethod;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [waitingBank, setWaitingBank] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recoveringRedirect, setRecoveringRedirect] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const setFormBusy = (value: boolean) => {
    setBusy(value);
    onBusyChange?.(value);
  };

  const finalizeSucceededPayment = async () => {
    setFormBusy(true);
    setWaitingBank(false);
    try {
      await onSuccessRef.current();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível confirmar o pedido");
      setFormBusy(false);
    }
  };

  useEffect(() => {
    if (!stripe) return;
    const redirect = readStripeRedirectFromUrl();
    if (!redirect.clientSecret || redirect.redirectStatus !== "succeeded") return;

    let cancelled = false;
    setRecoveringRedirect(true);
    setFormBusy(true);
    setErr(null);

    void (async () => {
      try {
        const { paymentIntent, error } = await stripe.retrievePaymentIntent(redirect.clientSecret!);
        if (cancelled) return;
        if (error) throw new Error(error.message || "Pagamento não confirmado");
        if (paymentIntent?.status === "succeeded") {
          clearStripeRedirectParams();
          await onSuccessRef.current();
          return;
        }
        if (paymentIntent?.status === "processing" || paymentIntent?.status === "requires_action") {
          setWaitingBank(true);
          await pollPaymentIntentUntilSettled(stripe, redirect.clientSecret!);
          if (cancelled) return;
          clearStripeRedirectParams();
          await onSuccessRef.current();
          return;
        }
        setErr("Pagamento ainda não confirmado. Aguarde ou tente novamente.");
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Não foi possível recuperar o pagamento");
        }
      } finally {
        if (!cancelled) {
          setRecoveringRedirect(false);
          setFormBusy(false);
          setWaitingBank(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stripe]);

  useEffect(() => {
    if (!busy && !waitingBank && !recoveringRedirect) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy, waitingBank, recoveringRedirect]);

  const pay = async () => {
    if (!stripe || !elements || busy || recoveringRedirect) return;
    setFormBusy(true);
    setWaitingBank(false);
    setErr(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErr(
          submitError.message ||
            (checkoutMethod === "bizum" ? "Confirme o número Bizum" : "Confirme os dados do cartão"),
        );
        setFormBusy(false);
        return;
      }

      const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: returnUrl },
      });

      if (error) {
        setErr(error.message || "Pagamento recusado");
        setFormBusy(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        await finalizeSucceededPayment();
        return;
      }

      if (
        paymentIntent?.status === "processing" ||
        paymentIntent?.status === "requires_action" ||
        checkoutMethod === "bizum"
      ) {
        setWaitingBank(true);
        try {
          await pollPaymentIntentUntilSettled(stripe, clientSecret);
          await finalizeSucceededPayment();
        } catch (pollErr) {
          setErr(pollErr instanceof Error ? pollErr.message : "Pagamento ainda não confirmado");
          setFormBusy(false);
          setWaitingBank(false);
        }
        return;
      }

      setErr("Pagamento ainda não confirmado. Tente novamente em alguns segundos.");
      setFormBusy(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível finalizar o pagamento");
      setFormBusy(false);
      setWaitingBank(false);
    }
  };

  const isLikelyMobile =
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

  const paymentElementOptions =
    checkoutMethod === "bizum"
      ? {
          layout: (compact ? "accordion" : "tabs") as "accordion" | "tabs",
          paymentMethodOrder: ["bizum"],
          wallets: { applePay: "never" as const, googlePay: "never" as const },
        }
      : {
          layout: (compact ? "accordion" : "tabs") as "accordion" | "tabs",
          wallets: { applePay: "auto" as const, googlePay: "auto" as const },
        };

  const locked = busy || waitingBank || recoveringRedirect;

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {waitingBank && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-start gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-foreground">A aguardar confirmação do banco…</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Não feche nem saia desta página até o pedido aparecer confirmado.
            </p>
          </div>
        </div>
      )}
      <PaymentElement options={paymentElementOptions} />
      {checkoutMethod === "bizum" ? (
        <p className="text-[10px] text-muted-foreground leading-relaxed px-0.5">
          {isLikelyMobile
            ? "Introduza o telemóvel associado ao Bizum e confirme na app do seu banco."
            : "Bizum funciona melhor no telemóvel. Abra kebabturco.net no Safari ou Chrome do telemóvel para pagar com Bizum."}
        </p>
      ) : (
        !isLikelyMobile && (
          <p className="text-[10px] text-muted-foreground leading-relaxed px-0.5">
            No computador só aparece o cartão. No telemóvel podem surgir Apple Pay ou Google Pay no topo do
            formulário.
          </p>
        )
      )}
      {err && <p className="text-xs font-bold text-destructive">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={locked}
          className={`flex-1 rounded-xl border border-border font-bold text-muted-foreground disabled:opacity-40 ${compact ? "h-10 text-sm" : "h-12 rounded-2xl"}`}
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={pay}
          disabled={!stripe || locked}
          className={`flex-[2] rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center gap-2 disabled:opacity-70 ${compact ? "h-10 text-sm" : "h-12 rounded-2xl"}`}
        >
          {locked ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pagar ${amountLabel}`}
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
  onBusyChange?: (busy: boolean) => void;
  compact?: boolean;
  connectEnvironment?: StripePublishableEnvironment;
  publishableKey?: string | null;
  checkoutMethod?: StripeCheckoutMethod;
  paymentMethodTypes?: string[];
}) {
  const checkoutMethod = props.checkoutMethod ?? "card";
  const environment = props.connectEnvironment ?? "live";
  const stripePromise = useMemo(() => getStripePromise(environment, props.publishableKey), [environment, props.publishableKey]);

  const bizumMismatch =
    checkoutMethod === "bizum" &&
    props.paymentMethodTypes &&
    props.paymentMethodTypes.length > 0 &&
    !props.paymentMethodTypes.includes("bizum");

  if (bizumMismatch) {
    return (
      <div className="space-y-3 p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl">
        <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
          Bizum ainda não está activo no servidor de pagamentos.
        </p>
        <p className="text-xs text-muted-foreground">
          O sistema abriu o formulário de cartão por engano. Volte atrás, escolha <strong>Tarjeta</strong>, ou peça
          ao restaurante para publicar a última actualização na Lovable e activar Bizum na Stripe.
        </p>
        <button
          type="button"
          onClick={props.onCancel}
          className="w-full h-10 rounded-xl border border-border font-bold text-sm"
        >
          Voltar e escolher outro método
        </button>
      </div>
    );
  }

  if ((!props.publishableKey && !hasStripePublishableKey(environment)) || !stripePromise) {
    return (
      <p className="text-sm text-destructive font-bold p-4 bg-destructive/10 rounded-2xl">
        Pagamento online ainda não está disponível neste site. Peça ao restaurante para activar os recebimentos.
      </p>
    );
  }

  return (
    <Elements
      key={`${props.clientSecret}:${checkoutMethod}`}
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: { theme: "stripe", variables: { colorPrimary: "#D62300" } },
      }}
    >
      <CheckoutForm
        clientSecret={props.clientSecret}
        amountLabel={props.amountLabel}
        onSuccess={props.onSuccess}
        onCancel={props.onCancel}
        onBusyChange={props.onBusyChange}
        compact={props.compact}
        checkoutMethod={checkoutMethod}
      />
    </Elements>
  );
}
