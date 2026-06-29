import { getLocalPushSubscription } from "@/lib/push/getLocalPushSubscription";
import {
  getNativeDevicePushStatus,
  isNativePushAvailable,
} from "@/services/nativePush";

export type LocalDevicePushStatus = {
  ready: boolean;
  mode: "native" | "web" | "none";
  label: string;
  tokenPreview?: string | null;
};

export async function getLocalDevicePushStatus(): Promise<LocalDevicePushStatus> {
  if (await isNativePushAvailable()) {
    const native = await getNativeDevicePushStatus();
    return {
      ready: native.ready,
      mode: "native",
      label:
        native.permission === "granted"
          ? native.ready
            ? "registado neste telemóvel"
            : "permissão OK — falta registar"
          : native.permission === "denied"
            ? "permissão negada no telemóvel"
            : "aguardando permissão",
      tokenPreview: native.tokenPreview,
    };
  }

  const web = await getLocalPushSubscription();
  return {
    ready: Boolean(web),
    mode: web ? "web" : "none",
    label: web ? "registado neste browser" : "não registado neste browser",
  };
}
