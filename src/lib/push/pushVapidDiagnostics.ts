import {
  getVapidPublicKey,
  getVapidPublicKeySource,
  urlBase64ToUint8Array,
  isValidVapidPublicKeyFormat,
} from "@/lib/vapidPublicKey";

export type VapidKeyDiagnostics = {
  loaded: boolean;
  source: "app" | "env" | "none";
  keyPreview: string;
  keyLength: number;
  validFormat: boolean;
  decodable: boolean;
  decodeError?: string;
};

export function getVapidKeyDiagnostics(): VapidKeyDiagnostics {
  const source = getVapidPublicKeySource();
  const key = getVapidPublicKey();

  if (!key) {
    return {
      loaded: false,
      source: "none",
      keyPreview: "—",
      keyLength: 0,
      validFormat: false,
      decodable: false,
    };
  }

  let decodable = false;
  let decodeError: string | undefined;

  try {
    const bytes = urlBase64ToUint8Array(key);
    decodable = bytes.length >= 65;
  } catch (e) {
    decodeError = e instanceof Error ? e.message : String(e);
  }

  const preview =
    key.length <= 16 ? key : `${key.slice(0, 12)}…${key.slice(-6)}`;

  return {
    loaded: true,
    source,
    keyPreview: preview,
    keyLength: key.length,
    validFormat: isValidVapidPublicKeyFormat(key),
    decodable,
    decodeError,
  };
}
