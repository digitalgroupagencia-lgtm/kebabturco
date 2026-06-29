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

const outDir = path.join(root, "public", ".well-known");
const outPath = path.join(outDir, "assetlinks.json");

function existingFingerprint() {
  try {
    const current = JSON.parse(fs.readFileSync(outPath, "utf8"));
    const value = current?.[0]?.target?.sha256_cert_fingerprints?.[0];
    if (typeof value === "string" && value && !value.startsWith("REPLACE_")) return value;
  } catch {
    // Mantém fallback seguro quando ainda não existe assetlinks.json.
  }
  return "";
}

const packageName = process.env.VITE_ANDROID_PACKAGE_NAME?.trim() || "com.eurobusinessgroup.kebabturco";
const fingerprint = process.env.VITE_ANDROID_SHA256_FINGERPRINT?.trim() || existingFingerprint();

const payload = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: [
        fingerprint || "REPLACE_WITH_SHA256_CERT_FINGERPRINT",
      ],
    },
  },
];

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");

if (fingerprint) {
  console.log("assetlinks.json gerado com package e fingerprint reais.");
} else {
  console.warn(
    "assetlinks.json gerado com package real e fingerprint pendente — defina VITE_ANDROID_SHA256_FINGERPRINT com o SHA-256 da Play Console.",
  );
}
