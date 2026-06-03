import { Capacitor } from "@capacitor/core";

type Orientation = "portrait" | "unspecified";

type NativeBridgeResult = {
  callbackId?: string;
  success?: boolean;
  data?: unknown;
  error?: { message?: string } | string | unknown;
};

type AndroidBridgeWindow = Window & {
  androidBridge?: { postMessage: (message: string) => void; onmessage?: (event: MessageEvent<string>) => void };
  Capacitor?: (typeof Capacitor) & {
    __androidOrientationPatched?: boolean;
    Plugins?: Record<string, unknown>;
    fromNative?: (result: NativeBridgeResult) => void;
  };
};

const callbacks = new Map<string, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void; timeout: number }>();
let counter = Math.floor(Math.random() * 100000);

function nativeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  if (error && typeof error === "object" && "message" in error) {
    return new Error(String((error as { message?: unknown }).message));
  }
  return new Error(String(error ?? "Erro nativo desconhecido"));
}

function patchBridge(win: AndroidBridgeWindow) {
  const cap = win.Capacitor;
  if (!cap || cap.__androidOrientationPatched) return;

  const originalFromNative = cap.fromNative?.bind(cap);
  cap.fromNative = (result: NativeBridgeResult) => {
    if (result?.callbackId?.startsWith("android-orientation-") && callbacks.has(result.callbackId)) {
      const callback = callbacks.get(result.callbackId)!;
      window.clearTimeout(callback.timeout);
      callbacks.delete(result.callbackId);
      if (result.success) callback.resolve(result.data);
      else callback.reject(nativeError(result.error));
      return;
    }
    originalFromNative?.(result);
  };

  const originalOnMessage = win.androidBridge?.onmessage?.bind(win.androidBridge) as ((event: MessageEvent<string>) => void) | undefined;
  if (win.androidBridge) {
    win.androidBridge.onmessage = (event: MessageEvent<string>) => {
      try {
        const result = JSON.parse(event.data) as NativeBridgeResult;
        if (result?.callbackId?.startsWith("android-orientation-") && callbacks.has(result.callbackId)) {
          cap.fromNative?.(result);
          return;
        }
      } catch {
        // mantém mensagens normais do Capacitor
      }
      originalOnMessage?.(event);
    };
  }

  cap.__androidOrientationPatched = true;
}

function callNativeOrientation(orientation: Orientation): Promise<unknown> {
  const win = window as AndroidBridgeWindow;
  const plugin = win.Capacitor?.Plugins?.AndroidScreenOrientation as
    | { setOrientation?: (options: { orientation: Orientation }) => Promise<unknown> }
    | undefined;

  if (typeof plugin?.setOrientation === "function") {
    return plugin.setOrientation({ orientation });
  }

  if (!win.androidBridge?.postMessage || !win.Capacitor) {
    return Promise.reject(new Error("Bridge Android indisponível"));
  }

  patchBridge(win);
  return new Promise((resolve, reject) => {
    const callbackId = `android-orientation-${Date.now()}-${++counter}`;
    const timeout = window.setTimeout(() => {
      callbacks.delete(callbackId);
      reject(new Error("Timeout ao ajustar orientação"));
    }, 5000);

    callbacks.set(callbackId, { resolve, reject, timeout });
    win.androidBridge!.postMessage(
      JSON.stringify({
        callbackId,
        pluginId: "AndroidScreenOrientation",
        methodName: "setOrientation",
        options: { orientation },
      }),
    );
  });
}

export async function setAndroidOrientation(orientation: Orientation) {
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
  try {
    await callNativeOrientation(orientation);
  } catch (error) {
    console.warn("[AndroidOrientation] falha ao ajustar orientação", error);
  }
}