import { useEffect, useMemo, useRef, useState } from "react";
import { type Stripe, type StripeElementLocale } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import {
  hasStripePublishableKey,
  type StripePublishableEnvironment,
} from "@/lib/stripePublishableKey";
import { getStripePromise } from "@/lib/stripeLoader";
import {
  clearStripeRedirectParams,
  readStripeRedirectFromUrl,
} from "@/lib/stripeCheckoutSession";
import { DEFAULT_DIAL_CODE, formatFullPhone, isValidCustomerPhone } from "@/lib/phoneNumber";

export type StripeCheckoutMethod = "card" | "bizum";

export type StripeFormCopy = {
  back: string;
  phoneLabel: string;
  waitingBank: string;
  waitingBankSub: string;
  payLabel: string;
  bizumPhoneHint: string;
  bizumDesktopHint: string;
  cardDesktopHint: string;
  confirmBizumPhone: string;
  confirmCard: string;
  paymentDeclined: string;
  paymentPending: string;
  paymentCanceled: string;
  orderConfirmFailed: string;
  recoverFailed: string;
  bizumMismatchTitle: string;
  bizumMismatchBody: string;
  bizumMismatchBack: string;
  onlineUnavailable: string;
};

async function pollPaymentIntentUntilSettled(
  stripe: Stripe,
  clientSecret: string,
  paymentCanceledMsg: string,
  paymentPendingMsg: string,
  maxAttempts = 45,
  intervalMs = 2000,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
    if (error) throw new Error(error.message || paymentPendingMsg);
    if (paymentIntent?.status === "succeeded") return paymentIntent;
    if (paymentIntent?.status === "canceled" || paymentIntent?.status === "requires_payment_method") {
      throw new Error(paymentCanceledMsg);
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }
  }
  throw new Error(paymentPendingMsg);
}

function useCheckoutGuards(busy: boolean, waitingBank: boolean, recoveringRedirect: boolean) {
  useEffect(() => {
    if (!busy && !waitingBank && !recoveringRedirect) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy, waitingBank, recoveringRedirect]);
}

function WaitingBankBanner({ copy, compact }: { copy: StripeFormCopy; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-start gap-2">
      <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0 mt-0.5" />
      <div>
        <p className={`font-bold text-foreground ${compact ? "text-xs" : "text-sm"}`}>{copy.waitingBank}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{copy.waitingBankSub}</p>
      </div>
    </div>
  );
}

function PayActions({
  copy,
  amountLabel,
  locked,
  canPay,
  onCancel,
  onPay,
  compact,
}: {
  copy: StripeFormCopy;
  amountLabel: string;
  locked: boolean;
  canPay: boolean;
  onCancel: () => void;
  onPay: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={locked}
        className={`flex-1 rounded-xl border border-border font-bold text-muted-foreground disabled:opacity-40 ${compact ? "h-10 text-sm" : "h-12 rounded-2xl"}`}
      >
        {copy.back}
      </button>
      <button
        type="button"
        onClick={onPay}
        disabled={!canPay || locked}
        className={`flex-[2] rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center gap-2 disabled:opacity-70 ${compact ? "h-10 text-sm" : "h-12 rounded-2xl"}`}
      >
        {locked ? <Loader2 className="w-4 h-4 animate-spin" /> : `${copy.payLabel} ${amountLabel}`}
      </button>
    </div>
  );
}

function BizumCheckoutForm({
  clientSecret,
  amountLabel,
  onSuccess,
  onCancel,
  onBusyChange,
  compact,
  copy,
  defaultDialCode,
  defaultLocalPhone,
}: {
  clientSecret: string;
  amountLabel: string;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
  compact?: boolean;
  copy: StripeFormCopy;
  defaultDialCode?: string;
  defaultLocalPhone?: string;
}) {
  const stripe = useStripe();
  const [busy, setBusy] = useState(false);
  const [waitingBank, setWaitingBank] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recoveringRedirect, setRecoveringRedirect] = useState(false);
  const [dialCode, setDialCode] = useState(defaultDialCode || DEFAULT_DIAL_CODE);
  const [localPhone, setLocalPhone] = useState(defaultLocalPhone || "");
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
      setErr(e instanceof Error ? e.message : copy.orderConfirmFailed);
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
        if (error) throw new Error(error.message || copy.paymentPending);
        if (paymentIntent?.status === "succeeded") {
          clearStripeRedirectParams();
          await onSuccessRef.current();
          return;
        }
        if (paymentIntent?.status === "processing" || paymentIntent?.status === "requires_action") {
          setWaitingBank(true);
          await pollPaymentIntentUntilSettled(
            stripe,
            redirect.clientSecret!,
            copy.paymentCanceled,
            copy.paymentPending,
          );
          if (cancelled) return;
          clearStripeRedirectParams();
          await onSuccessRef.current();
          return;
        }
        setErr(copy.paymentPending);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : copy.recoverFailed);
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
  }, [stripe, copy]);

  useCheckoutGuards(busy, waitingBank, recoveringRedirect);

  const pay = async () => {
    if (!stripe || busy || recoveringRedirect) return;
    if (dialCode !== "+34") {
      setErr(copy.confirmBizumPhone);
      return;
    }
    if (!isValidCustomerPhone(dialCode, localPhone)) {
      setErr(copy.confirmBizumPhone);
      return;
    }

    setFormBusy(true);
    setWaitingBank(false);
    setErr(null);

    const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const phone = formatFullPhone(dialCode, localPhone);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            type: "bizum",
            billing_details: { phone },
          },
        } as never,
        redirect: "if_required" as never,
      });

      if (error) {
        setErr(error.message || copy.paymentDeclined);
        setFormBusy(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        await finalizeSucceededPayment();
        return;
      }

      setWaitingBank(true);
      try {
        await pollPaymentIntentUntilSettled(stripe, clientSecret, copy.paymentCanceled, copy.paymentPending);
        await finalizeSucceededPayment();
      } catch (pollErr) {
        setErr(pollErr instanceof Error ? pollErr.message : copy.paymentPending);
        setFormBusy(false);
        setWaitingBank(false);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.paymentDeclined);
      setFormBusy(false);
      setWaitingBank(false);
    }
  };

  const isLikelyMobile =
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

  const locked = busy || waitingBank || recoveringRedirect;

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {waitingBank && <WaitingBankBanner copy={copy} compact={compact} />}
      <div>
        <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">{copy.phoneLabel}</label>
        <PhoneInput
          dialCode={dialCode}
          onDialCodeChange={setDialCode}
          localNumber={localPhone}
          onLocalNumberChange={setLocalPhone}
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed px-0.5">
        {isLikelyMobile ? copy.bizumPhoneHint : copy.bizumDesktopHint}
      </p>
      {err && <p className="text-xs font-bold text-destructive">{err}</p>}
      <PayActions
        copy={copy}
        amountLabel={amountLabel}
        locked={locked}
        canPay={Boolean(stripe)}
        onCancel={onCancel}
        onPay={pay}
        compact={compact}
      />
    </div>
  );
}

function CardCheckoutForm({
  clientSecret,
  amountLabel,
  onSuccess,
  onCancel,
  onBusyChange,
  compact,
  copy,
}: {
  clientSecret: string;
  amountLabel: string;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
  compact?: boolean;
  copy: StripeFormCopy;
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
      setErr(e instanceof Error ? e.message : copy.orderConfirmFailed);
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
        if (error) throw new Error(error.message || copy.paymentPending);
        if (paymentIntent?.status === "succeeded") {
          clearStripeRedirectParams();
          await onSuccessRef.current();
          return;
        }
        if (paymentIntent?.status === "processing" || paymentIntent?.status === "requires_action") {
          setWaitingBank(true);
          await pollPaymentIntentUntilSettled(
            stripe,
            redirect.clientSecret!,
            copy.paymentCanceled,
            copy.paymentPending,
          );
          if (cancelled) return;
          clearStripeRedirectParams();
          await onSuccessRef.current();
          return;
        }
        setErr(copy.paymentPending);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : copy.recoverFailed);
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
  }, [stripe, copy]);

  useCheckoutGuards(busy, waitingBank, recoveringRedirect);

  const pay = async () => {
    if (!stripe || !elements || busy || recoveringRedirect) return;
    setFormBusy(true);
    setWaitingBank(false);
    setErr(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErr(submitError.message || copy.confirmCard);
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
        setErr(error.message || copy.paymentDeclined);
        setFormBusy(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        await finalizeSucceededPayment();
        return;
      }

      if (paymentIntent?.status === "processing" || paymentIntent?.status === "requires_action") {
        setWaitingBank(true);
        try {
          await pollPaymentIntentUntilSettled(stripe, clientSecret, copy.paymentCanceled, copy.paymentPending);
          await finalizeSucceededPayment();
        } catch (pollErr) {
          setErr(pollErr instanceof Error ? pollErr.message : copy.paymentPending);
          setFormBusy(false);
          setWaitingBank(false);
        }
        return;
      }

      setErr(copy.paymentPending);
      setFormBusy(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.paymentDeclined);
      setFormBusy(false);
      setWaitingBank(false);
    }
  };

  const isLikelyMobile =
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

  const locked = busy || waitingBank || recoveringRedirect;

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {waitingBank && <WaitingBankBanner copy={copy} compact={compact} />}
      <PaymentElement
        options={{
          layout: (compact ? "accordion" : "tabs") as "accordion" | "tabs",
          paymentMethodOrder: ["apple_pay", "google_pay", "card"],
          wallets: {
            applePay: "auto" as const,
            googlePay: "auto" as const,
            link: "never" as const,
          },
          terms: { card: "never" as const, applePay: "never" as const, googlePay: "never" as const },
        }}
      />
      {!isLikelyMobile && (
        <p className="text-[10px] text-muted-foreground leading-relaxed px-0.5">{copy.cardDesktopHint}</p>
      )}
      {err && <p className="text-xs font-bold text-destructive">{err}</p>}
      <PayActions
        copy={copy}
        amountLabel={amountLabel}
        locked={locked}
        canPay={Boolean(stripe)}
        onCancel={onCancel}
        onPay={pay}
        compact={compact}
      />
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
  locale?: StripeElementLocale;
  copy: StripeFormCopy;
  defaultDialCode?: string;
  defaultLocalPhone?: string;
}) {
  const checkoutMethod = props.checkoutMethod ?? "card";
  const environment = props.connectEnvironment ?? "live";
  const locale = props.locale ?? "es";
  const stripePromise = useMemo(
    () => getStripePromise(environment, props.publishableKey, locale),
    [environment, props.publishableKey, locale],
  );

  const bizumMismatch =
    checkoutMethod === "bizum" &&
    props.paymentMethodTypes &&
    props.paymentMethodTypes.length > 0 &&
    !props.paymentMethodTypes.includes("bizum");

  if (bizumMismatch) {
    return (
      <div className="space-y-3 p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl">
        <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{props.copy.bizumMismatchTitle}</p>
        <p className="text-xs text-muted-foreground">{props.copy.bizumMismatchBody}</p>
        <button
          type="button"
          onClick={props.onCancel}
          className="w-full h-10 rounded-xl border border-border font-bold text-sm"
        >
          {props.copy.bizumMismatchBack}
        </button>
      </div>
    );
  }

  if ((!props.publishableKey && !hasStripePublishableKey(environment)) || !stripePromise) {
    return (
      <p className="text-sm text-destructive font-bold p-4 bg-destructive/10 rounded-2xl">{props.copy.onlineUnavailable}</p>
    );
  }

  return (
    <Elements
      key={`${props.clientSecret}:${checkoutMethod}:${locale}`}
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        locale,
        appearance: { theme: "stripe", variables: { colorPrimary: "#D62300" } },
      }}
    >
      {checkoutMethod === "bizum" ? (
        <BizumCheckoutForm
          clientSecret={props.clientSecret}
          amountLabel={props.amountLabel}
          onSuccess={props.onSuccess}
          onCancel={props.onCancel}
          onBusyChange={props.onBusyChange}
          compact={props.compact}
          copy={props.copy}
          defaultDialCode={props.defaultDialCode}
          defaultLocalPhone={props.defaultLocalPhone}
        />
      ) : (
        <CardCheckoutForm
          clientSecret={props.clientSecret}
          amountLabel={props.amountLabel}
          onSuccess={props.onSuccess}
          onCancel={props.onCancel}
          onBusyChange={props.onBusyChange}
          compact={props.compact}
          copy={props.copy}
        />
      )}
    </Elements>
  );
}
