import { registerPlugin, WebPlugin } from "@capacitor/core";

export type ApnsBridgeDiagnostics = {
  appDelegateReceived: boolean;
  jsDelivered: boolean;
  receivedAt: number;
  lastError?: string | null;
  tokenPreview?: string | null;
  hasToken: boolean;
};

export interface ApnsTokenBridgePlugin {
  getSavedApnsToken(): Promise<{ token: string | null; hasToken: boolean }>;
  getBridgeDiagnostics(): Promise<ApnsBridgeDiagnostics>;
  markJsReceived(): Promise<void>;
  redeliverToJavaScript(): Promise<void>;
}

class ApnsTokenBridgeWeb extends WebPlugin implements ApnsTokenBridgePlugin {
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
    /* browser */
  }

  async redeliverToJavaScript() {
    /* browser */
  }
}

export const ApnsTokenBridge = registerPlugin<ApnsTokenBridgePlugin>("ApnsTokenBridge", {
  web: () => Promise.resolve(new ApnsTokenBridgeWeb()),
});
