import { registerPlugin, WebPlugin } from "@capacitor/core";

export type ApnsBridgeDiagnostics = {
  appDelegateReceived: boolean;
  jsDelivered: boolean;
  receivedAt: number;
  lastError?: string | null;
  tokenPreview?: string | null;
  hasToken: boolean;
  authorizationStatus?: string | null;
};

export type ApnsAuthorizationStatus = "granted" | "denied" | "prompt" | "unknown";

export interface ApnsTokenBridgePlugin {
  getSavedApnsToken(): Promise<{ token: string | null; hasToken: boolean }>;
  getBridgeDiagnostics(): Promise<ApnsBridgeDiagnostics>;
  markJsReceived(): Promise<void>;
  redeliverToJavaScript(): Promise<void>;
  requestPushAuthorization(): Promise<{ status: ApnsAuthorizationStatus }>;
  getNotificationAuthorizationStatus(): Promise<{ status: ApnsAuthorizationStatus }>;
  configureStaffLiveActivity?(options: {
    supabaseUrl: string;
    anonKey: string;
    jwt: string;
    storeId: string;
    userId?: string;
    deviceId?: string;
    appVersion?: string;
  }): Promise<{ ok: boolean }>;
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

  async requestPushAuthorization() {
    return { status: "unknown" as ApnsAuthorizationStatus };
  }

  async getNotificationAuthorizationStatus() {
    return { status: "unknown" as ApnsAuthorizationStatus };
  }
}

export const ApnsTokenBridge = registerPlugin<ApnsTokenBridgePlugin>("ApnsTokenBridge", {
  web: () => Promise.resolve(new ApnsTokenBridgeWeb()),
});
