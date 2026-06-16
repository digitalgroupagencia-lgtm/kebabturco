#!/usr/bin/env node
/**
 * Diagnóstico local + opcional ligação read-only à App Store Connect.
 *
 * Sem chave Apple (só projecto):
 *   node scripts/apple-developer-diagnose.mjs
 *
 * Com chave API Apple (só leitura — NÃO commitar a chave):
 *   export APPLE_ISSUER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 *   export APPLE_KEY_ID="AB12CD34EF"
 *   export APPLE_KEY_PATH="$HOME/Downloads/AuthKey_AB12CD34EF.p8"
 *   node scripts/apple-developer-diagnose.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const BUNDLE_ID = "net.kebabturco.app";
const APP_NAME = "Kebab Turco";

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function miss(msg) {
  console.log(`  ✗ ${msg}`);
}
function warn(msg) {
  console.log(`  ! ${msg}`);
}

function b64url(input) {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function makeAscJwt(keyId, issuerId, privateKeyPem) {
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: issuerId, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign("sha256", Buffer.from(unsigned), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${unsigned}.${b64url(signature)}`;
}

async function ascGet(jwt, apiPath) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${apiPath}`, {
    headers: { Authorization: `Bearer ${jwt}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Apple API ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

function checkLocalProject() {
  console.log("\n── 1. Projecto no Mac (GitHub / Lovable) ──\n");

  const iosApp = path.join(ROOT, "ios", "App", "App");
  const xcodeProj = path.join(ROOT, "ios", "App", "App.xcodeproj");
  const googlePlist = path.join(iosApp, "GoogleService-Info.plist");
  const capacitor = path.join(ROOT, "capacitor.config.ts");

  if (fs.existsSync(xcodeProj)) ok("Estrutura iPhone encontrada");
  else miss("Falta pasta iPhone — corra npm run cap:prepare:ios num Mac");

  if (fs.existsSync(googlePlist)) ok("Ligação Google (Firebase) para iPhone colocada");
  else miss("Falta ficheiro Google no projecto iPhone — descarregar do Firebase");

  const pbx = fs.existsSync(xcodeProj)
    ? fs.readFileSync(path.join(xcodeProj, "project.pbxproj"), "utf8")
    : "";
  if (pbx.includes("DEVELOPMENT_TEAM")) {
    if (/DEVELOPMENT_TEAM = [A-Z0-9]{10}/.test(pbx)) ok("Equipa Apple definida no Xcode");
    else warn("Equipa Apple ainda vazia — abrir Xcode → Signing → escolher Team");
  }
  if (pbx.includes("aps-environment") || pbx.includes("Push Notifications")) {
    ok("Notificações push parecem activadas no projecto");
  } else {
    miss("Notificações push NÃO activadas no Xcode (+ Capability → Push Notifications)");
  }

  if (fs.existsSync(capacitor)) {
    const cap = fs.readFileSync(capacitor, "utf8");
    if (cap.includes("kebabturco.net")) ok("App abre o site publicado kebabturco.net");
  }

  console.log(`\n  Identificador da app: ${BUNDLE_ID}`);
}

async function checkAppleConnect() {
  console.log("\n── 2. Conta Apple (App Store Connect API) ──\n");

  const issuerId = process.env.APPLE_ISSUER_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const keyPath = process.env.APPLE_KEY_PATH?.trim();

  if (!issuerId || !keyId || !keyPath) {
    warn("Chave API Apple não configurada neste terminal.");
    console.log("\n  Para me «ligar» à sua conta (só leitura), faça:");
    console.log("  1) appstoreconnect.apple.com → Utilizadores e acesso → Integrações → API App Store Connect");
    console.log("  2) + Gerar chave API → Nome: Cursor Diagnóstico → Acesso: App Manager (ou Admin)");
    console.log("  3) Descarregar ficheiro .p8 (só uma vez!)");
    console.log("  4) Copiar o Issuer ID que aparece na mesma página");
    console.log("  5) No terminal:");
    console.log('     export APPLE_ISSUER_ID="cole-o-issuer-id"');
    console.log('     export APPLE_KEY_ID="cole-o-key-id"');
    console.log('     export APPLE_KEY_PATH="$HOME/Downloads/AuthKey_XXXX.p8"');
    console.log("     node scripts/apple-developer-diagnose.mjs");
    console.log("\n  6) Copie TODA a saída e cole no chat do Cursor.");
    console.log("\n  ⚠️  NUNCA cole a chave .p8 no chat — só no terminal local.");
    return;
  }

  if (!fs.existsSync(keyPath)) {
    miss(`Ficheiro de chave não encontrado: ${keyPath}`);
    return;
  }

  try {
    const privateKey = fs.readFileSync(keyPath, "utf8");
    const jwt = makeAscJwt(keyId, issuerId, privateKey);
    ok("Ligação à Apple OK (chave válida)");

    const apps = await ascGet(jwt, "/v1/apps?limit=50");
    const list = apps.data ?? [];
    if (list.length === 0) {
      warn("Nenhuma app na App Store Connect — precisa criar «Kebab Turco» de novo");
    } else {
      ok(`${list.length} app(s) na App Store Connect:`);
      for (const app of list) {
        const name = app.attributes?.name ?? "?";
        const bundle = app.attributes?.bundleId ?? "?";
        const mark = bundle === BUNDLE_ID ? "← ESTA" : "";
        console.log(`      • ${name} (${bundle}) ${mark}`);
      }
    }

    const match = list.find((a) => a.attributes?.bundleId === BUNDLE_ID);
    if (!match) {
      miss(`App com identificador ${BUNDLE_ID} NÃO existe na loja — criar em App Store Connect`);
    } else {
      ok("App Kebab Turco encontrada na App Store Connect");
    }

    try {
      const bundleResp = await ascGet(
        jwt,
        `/v1/bundleIds?filter[identifier]=${encodeURIComponent(BUNDLE_ID)}`,
      );
      if ((bundleResp.data ?? []).length > 0) ok("Identificador registado em developer.apple.com");
      else miss("Identificador NÃO existe em Certificates, Identifiers & Profiles — criar App ID");
    } catch {
      warn("Não foi possível verificar Identifiers (permissão da chave API)");
    }
  } catch (e) {
    miss(`Erro ao falar com Apple: ${e instanceof Error ? e.message : String(e)}`);
    console.log("\n  Verifique: chave .p8 correcta, Key ID, Issuer ID, conta Developer activa.");
  }
}

function printNextSteps() {
  console.log("\n── 3. O que fazer a seguir ──\n");
  console.log("  Copie TODA esta saída e cole no chat do Cursor.");
  console.log("  Eu analiso e digo o passo exacto seguinte.");
  console.log("\n  Ordem habitual:");
  console.log("  • Firebase → app iPhone + ficheiro Google");
  console.log("  • Apple Developer → chave push (APNs)");
  console.log("  • Firebase → ligar chave Apple");
  console.log("  • Mac → npm run cap:prepare:ios → Xcode → Archive → enviar");
  console.log("");
}

console.log("══════════════════════════════════════════════");
console.log(` ${APP_NAME} — diagnóstico Apple / iPhone`);
console.log("══════════════════════════════════════════════");

checkLocalProject();
await checkAppleConnect();
printNextSteps();
