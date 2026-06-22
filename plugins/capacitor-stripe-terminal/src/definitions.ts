export interface ProcessTapToPayPaymentOptions {
  publishableKey: string;
  connectionToken: string;
  locationId: string;
  onBehalfOf: string;
  clientSecret: string;
  /** Modo simulado (testes sem entitlement Apple). */
  simulated?: boolean;
}

export interface ProcessTapToPayPaymentResult {
  paymentIntentId: string;
  status: string;
}

export interface StripeTerminalPlugin {
  processTapToPayPayment(
    options: ProcessTapToPayPaymentOptions,
  ): Promise<ProcessTapToPayPaymentResult>;
  cancelPayment(): Promise<void>;
  disconnectReader(): Promise<void>;
  isTapToPaySupported(): Promise<{ supported: boolean }>;
}
