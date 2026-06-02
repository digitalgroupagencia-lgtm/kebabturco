#!/usr/bin/env node
/**
 * Gera par VAPID para Web Push (equipa + clientes).
 * Uso: node scripts/generate-vapid-keys.mjs
 *
 * Copiar:
 *   VITE_VAPID_PUBLIC_KEY  → Lovable / Vercel (público)
 *   VAPID_PUBLIC_KEY       → Lovable Cloud secrets (send-push-notification)
 *   VAPID_PRIVATE_KEY      → Lovable Cloud secrets (send-push-notification)
 */
import { generateKeyPairSync } from "node:crypto";

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});

// Exporta via JWK — método portátil e correcto.
const pubJwk = publicKey.export({ format: "jwk" });
const privJwk = privateKey.export({ format: "jwk" });

const x = Buffer.from(pubJwk.x, "base64");
const y = Buffer.from(pubJwk.y, "base64");
// Chave pública VAPID = 0x04 || X || Y (uncompressed P-256, 65 bytes)
const pubRaw = Buffer.concat([Buffer.from([0x04]), x, y]);
// Chave privada VAPID = scalar `d` (32 bytes)
const privRaw = Buffer.from(privJwk.d, "base64");

if (pubRaw.length !== 65 || privRaw.length !== 32) {
  console.error("Erro: tamanhos inesperados", { pub: pubRaw.length, priv: privRaw.length });
  process.exit(1);
}

const publicKeyB64 = b64url(pubRaw);
const privateKeyB64 = b64url(privRaw);

console.log("VAPID keys (Web Push)\n");
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKeyB64}`);
console.log(`VAPID_PUBLIC_KEY=${publicKeyB64}`);
console.log(`VAPID_PRIVATE_KEY=${privateKeyB64}`);
console.log("\nLovable Cloud → Secrets: VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY");
console.log("Frontend (.env / src/lib/vapidPublicKey.ts): VITE_VAPID_PUBLIC_KEY");
