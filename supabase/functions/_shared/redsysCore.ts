// Core utilitário Redsys/Bizum, sem credenciais reais.
// Implementa assinatura HMAC SHA-256 + Triple DES conforme docs Redsys.
// Esta camada está PRONTA para uso assim que MERCHANT_CODE/TERMINAL/SECRET_KEY forem configurados na loja.

import { createHmac, createCipheriv } from "node:crypto";

export type RedsysGateway = "redsys" | "bizum";

export interface RedsysMerchantParams {
  DS_MERCHANT_AMOUNT: string;           // cêntimos, ex "1099"
  DS_MERCHANT_ORDER: string;            // 4-12 chars
  DS_MERCHANT_MERCHANTCODE: string;     // FUC
  DS_MERCHANT_CURRENCY: string;         // 978 = EUR
  DS_MERCHANT_TRANSACTIONTYPE: string;  // 0 autorização
  DS_MERCHANT_TERMINAL: string;
  DS_MERCHANT_MERCHANTURL?: string;     // notificação online
  DS_MERCHANT_URLOK?: string;
  DS_MERCHANT_URLKO?: string;
  DS_MERCHANT_PAYMETHODS?: string;      // "z" para Bizum
  DS_MERCHANT_PRODUCTDESCRIPTION?: string;
  DS_MERCHANT_TITULAR?: string;
  DS_MERCHANT_MERCHANTNAME?: string;
  DS_MERCHANT_MERCHANTDATA?: string;
}

export function encodeBase64(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function decodeBase64Url(input: string): Uint8Array {
  const fixed = input.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(fixed);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 3DES-CBC com IV zero, chave = secretKey base64 (16 bytes para 3DES após padding ou 24 bytes) */
function diversifyKey(secretKey: string, order: string): Buffer {
  const key = Buffer.from(secretKey, "base64");
  // Garante 24 bytes (3DES)
  const k = Buffer.alloc(24);
  key.copy(k, 0, 0, Math.min(key.length, 24));
  const iv = Buffer.alloc(8, 0);
  const cipher = createCipheriv("des-ede3-cbc", k, iv);
  cipher.setAutoPadding(false);
  const padded = Buffer.alloc(Math.ceil(order.length / 8) * 8, 0);
  padded.write(order, 0, "utf8");
  return Buffer.concat([cipher.update(padded), cipher.final()]);
}

/** Assina parâmetros e devolve { Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature } */
export function signRedsysParams(params: RedsysMerchantParams, secretKey: string) {
  const json = JSON.stringify(params);
  const merchantParameters = encodeBase64(json);
  const order = params.DS_MERCHANT_ORDER;
  const derivedKey = diversifyKey(secretKey, order);
  const hmac = createHmac("sha256", derivedKey).update(merchantParameters).digest();
  const signature = encodeBase64(new Uint8Array(hmac));
  return {
    Ds_SignatureVersion: "HMAC_SHA256_V1",
    Ds_MerchantParameters: merchantParameters,
    Ds_Signature: signature,
  };
}

/** Decodifica e valida assinatura de notificação Redsys */
export function verifyRedsysNotification(
  merchantParameters: string,
  signature: string,
  secretKey: string,
): { valid: boolean; params: Record<string, string> } {
  try {
    const decoded = new TextDecoder().decode(decodeBase64Url(merchantParameters));
    const params = JSON.parse(decoded) as Record<string, string>;
    const order = params.Ds_Order || params.DS_ORDER || "";
    const derivedKey = diversifyKey(secretKey, order);
    const hmac = createHmac("sha256", derivedKey).update(merchantParameters).digest();
    const expected = encodeBase64(new Uint8Array(hmac))
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const incoming = signature.replace(/\+/g, "-").replace(/\//g, "_");
    return { valid: expected === incoming, params };
  } catch {
    return { valid: false, params: {} };
  }
}

export function redsysEnvironmentUrl(status: "sandbox" | "production"): string {
  return status === "production"
    ? "https://sis.redsys.es/sis/realizarPago"
    : "https://sis-t.redsys.es:25443/sis/realizarPago";
}
