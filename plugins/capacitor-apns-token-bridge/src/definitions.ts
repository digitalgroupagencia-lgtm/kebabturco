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
