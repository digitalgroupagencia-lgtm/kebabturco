import type { StripeTerminalPlugin } from "./definitions";

export class StripeTerminalWeb implements StripeTerminalPlugin {
  async processTapToPayPayment(): Promise<never> {
    throw new Error("Tap to Pay só está disponível na app iPhone da equipa.");
  }

  async cancelPayment(): Promise<void> {
    /* no-op */
  }

  async disconnectReader(): Promise<void> {
    /* no-op */
  }

  async isTapToPaySupported(): Promise<{ supported: boolean }> {
    return { supported: false };
  }
}
