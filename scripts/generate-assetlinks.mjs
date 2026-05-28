#!/usr/bin/env node
/**
 * Gera public/.well-known/assetlinks.json a partir de variáveis de ambiente.
 * Uso (antes do build ou deploy):
 *   VITE_ANDROID_PACKAGE_NAME=com.example.app \
 *   VITE_ANDROID_SHA256_FINGERPRINT=AA:BB:... \
 *   node scripts/generate-assetlinks.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const packageName = process.env.VITE_ANDROID_PACKAGE_NAME?.trim();
const fingerprint = process.env.VITE_ANDROID_SHA256_FINGERPRINT?.trim();

const payload = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName || "REPLACE_WITH_ANDROID_PACKAGE_NAME",
      sha256_cert_fingerprints: [
        fingerprint || "REPLACE_WITH_SHA256_CERT_FINGERPRINT",
      ],
    },
  },
];

const outDir = path.join(root, "public", ".well-known");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "assetlinks.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");

if (packageName && fingerprint) {
  console.log("assetlinks.json gerado com package e fingerprint reais.");
} else {
  console.warn(
    "assetlinks.json gerado com placeholders — defina VITE_ANDROID_PACKAGE_NAME e VITE_ANDROID_SHA256_FINGERPRINT.",
  );
}
