#!/usr/bin/env node
/**
 * Gera par VAPID para Web Push (equipa + clientes).
 * Uso: node scripts/generate-vapid-keys.mjs
 *
 * Copiar:
 *   VITE_VAPID_PUBLIC_KEY  → Lovable / Vercel (público)
 *   VAPID_PUBLIC_KEY       → Supabase Edge secrets (send-push-notification)
 *   VAPID_PRIVATE_KEY      → Supabase Edge secrets (send-push-notification)
 */
import { generateKeyPairSync } from "node:crypto";

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function exportVapidPublicKey(uncompressed) {
  return b64url(uncompressed);
}

function exportVapidPrivateKey(rawPrivate) {
  return b64url(rawPrivate);
}

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});

const pubDer = publicKey.export({ type: "spki", format: "der" });
const privDer = privateKey.export({ type: "pkcs8", format: "der" });

const pubRaw = pubDer.subarray(pubDer.length - 65);
const privRaw = privDer.subarray(privDer.length - 32);

const publicKeyB64 = exportVapidPublicKey(pubRaw);
const privateKeyB64 = exportVapidPrivateKey(privRaw);

console.log("VAPID keys (Web Push)\n");
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKeyB64}`);
console.log(`VAPID_PUBLIC_KEY=${publicKeyB64}`);
console.log(`VAPID_PRIVATE_KEY=${privateKeyB64}`);
console.log("\nSupabase → Edge Functions → send-push-notification → Secrets");
console.log("Lovable → Environment → VITE_VAPID_PUBLIC_KEY");
