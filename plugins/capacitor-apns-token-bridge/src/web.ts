import { WebPlugin } from "@capacitor/core";
import type { ApnsTokenBridgePlugin } from "./definitions";

export class ApnsTokenBridgeWeb extends WebPlugin implements ApnsTokenBridgePlugin {
  async getSavedApnsToken() {
    return { token: null, hasToken: false };
  }

  async getBridgeDiagnostics() {
    return {
      appDelegateReceived: false,
      jsDelivered: false,
      receivedAt: 0,
      hasToken: false,
    };
  }

  async markJsReceived() {
    /* web */
  }

  async redeliverToJavaScript() {
    /* web */
  }
}
