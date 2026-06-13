import { loadStripe, type Stripe, type StripeElementLocale } from "@stripe/stripe-js";
import {
  getStripePublishableKeyForEnvironment,
  type StripePublishableEnvironment,
} from "@/lib/stripePublishableKey";

const stripePromiseCache: Partial<Record<string, Promise<Stripe | null>>> = {};

export function getStripePromise(
  environment: StripePublishableEnvironment = "live",
  publishableKey?: string | null,
  locale: StripeElementLocale = "es",
) {
  const key = publishableKey?.startsWith("pk_") ? publishableKey : getStripePublishableKeyForEnvironment(environment);
  if (!key) return null;
  const cacheKey = `${environment}:${key}:${locale}`;
  if (!stripePromiseCache[cacheKey]) {
    stripePromiseCache[cacheKey] = loadStripe(key, { locale });
  }
  return stripePromiseCache[cacheKey]!;
}

/** Descarrega o SDK Stripe em segundo plano para o formulário abrir mais depressa. */
export function preloadStripeCheckout(
  environment: StripePublishableEnvironment = "live",
  publishableKey?: string | null,
  locale: StripeElementLocale = "es",
) {
  void getStripePromise(environment, publishableKey, locale);
}
