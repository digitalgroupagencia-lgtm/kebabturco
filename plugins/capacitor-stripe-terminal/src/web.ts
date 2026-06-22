import { WebPlugin } from "@capacitor/core";
import type { StripeTerminalPlugin } from "./definitions";

export class StripeTerminalWeb extends WebPlugin implements StripeTerminalPlugin {
  async processTapToPayPayment(): Promise<never> {
    throw new Error("Tap to Pay só está disponível na app iPhone da equipa.");
  }

  async warmUpTapToPay(): Promise<never> {
    throw new Error("Tap to Pay só está disponível na app iPhone da equipa.");
  }

  async showMerchantEducation(): Promise<{ shown: boolean; reason: string }> {
    return { shown: false, reason: "web" };
  }

  async cancelPayment(): Promise<void> {
    return;
  }

  async disconnectReader(): Promise<void> {
    return;
  }

  async isTapToPaySupported(): Promise<{ supported: boolean }> {
    return { supported: false };
  }

  async getReaderStatus(): Promise<{ status: string; ready: boolean; connected: boolean }> {
    return { status: "idle", ready: false, connected: false };
  }

  async checkAppleTermsStatus(): Promise<{ linked: boolean; message: string; explicitCheckAvailable: boolean }> {
    return {
      linked: false,
      message: "Só disponível na app iPhone da equipa.",
      explicitCheckAvailable: false,
    };
  }
}
