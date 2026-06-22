export interface ProcessTapToPayPaymentOptions {
  publishableKey: string;
  connectionToken: string;
  locationId: string;
  onBehalfOf: string;
  clientSecret: string;
  /** Modo simulado (testes sem entitlement Apple). */
  simulated?: boolean;
}

export interface WarmUpTapToPayOptions {
  connectionToken: string;
  locationId: string;
  onBehalfOf: string;
  simulated?: boolean;
}

export interface ProcessTapToPayPaymentResult {
  paymentIntentId: string;
  status: string;
}

export interface ReaderStatusResult {
  status: string;
  ready: boolean;
  connected?: boolean;
}

export interface StripeTerminalPlugin {
  processTapToPayPayment(
    options: ProcessTapToPayPaymentOptions,
  ): Promise<ProcessTapToPayPaymentResult>;
  warmUpTapToPay(options: WarmUpTapToPayOptions): Promise<{ status: string; ready: boolean }>;
  showMerchantEducation(): Promise<{ shown: boolean; mode?: string; reason?: string }>;
  cancelPayment(): Promise<void>;
  disconnectReader(): Promise<void>;
  isTapToPaySupported(): Promise<{ supported: boolean }>;
  getReaderStatus(): Promise<ReaderStatusResult>;
  addListener(
    eventName: "readerProgress" | "readerStatusChanged",
    listenerFunc: (event: { progress?: number; message?: string; status?: string; ready?: boolean }) => void,
  ): Promise<{ remove: () => void }>;
}
