#!/usr/bin/env node
/**
 * Configura o Mac para demo visita — SEM service role (compatível com Lovable Cloud).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ENV_PATH = path.join(os.homedir(), ".kebab-visit-print.env");
const DEFAULT_URL = "https://kvpssbhclafoymhecmuk.supabase.co";
const PROJECT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadExisting(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function tryLoadFromProject() {
  const candidates = [
    path.join(PROJECT_DIR, ".env"),
    path.join(PROJECT_DIR, ".env.local"),
    path.join(PROJECT_DIR, "print-bridge", ".env"),
  ];
  const merged = {};
  for (const p of candidates) {
    Object.assign(merged, loadExisting(p));
  }
  return merged;
}

function mask(s) {
  if (!s || s.length < 8) return "(vazio)";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

async function prompt(rl, label, current) {
  const hint = current ? ` [${mask(current)}]` : "";
  const answer = (await rl.question(`${label}${hint}: `)).trim();
  return answer || current || "";
}

async function main() {
  console.log("\n=== Demo visita — configurar Mac (Lovable Cloud) ===\n");

  const existing = loadExisting(ENV_PATH);
  const fromProject = tryLoadFromProject();

  let url = existing.SUPABASE_URL || fromProject.SUPABASE_URL || fromProject.VITE_SUPABASE_URL || DEFAULT_URL;
  let anonKey =
    existing.SUPABASE_ANON_KEY ||
    fromProject.SUPABASE_ANON_KEY ||
    fromProject.VITE_SUPABASE_PUBLISHABLE_KEY ||
    fromProject.VITE_SUPABASE_ANON_KEY ||
    "";
  let bridgeToken = existing.VISIT_BRIDGE_TOKEN || fromProject.VISIT_BRIDGE_TOKEN || "";
  let ownerId = existing.VISIT_OWNER_USER_ID || fromProject.VISIT_OWNER_USER_ID || "";

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`Guardar em: ${ENV_PATH}\n`);

  console.log("1) URL do projeto (Enter = Kebab Turco)");
  url = await prompt(rl, "   SUPABASE_URL", url);

  console.log("\n2) Chave pública do site (anon / publishable)");
  console.log("   Lovable → Cloud → provavelmente VITE_SUPABASE_PUBLISHABLE_KEY");
  console.log("   Ou Supabase → Project Settings → API → anon public\n");
  anonKey = await prompt(rl, "   SUPABASE_ANON_KEY", anonKey);

  console.log("\n3) Código secreto do bridge (você inventa — mesma palavra em dois sítios):");
  if (!bridgeToken) {
    bridgeToken = crypto.randomBytes(24).toString("hex");
    console.log(`   Sugestão gerada: ${bridgeToken}`);
    console.log("   Cole ESTE MESMO valor em Lovable → Cloud → Secrets → VISIT_BRIDGE_TOKEN\n");
  } else {
    console.log("   Lovable → Cloud → Secrets → VISIT_BRIDGE_TOKEN\n");
  }
  bridgeToken = await prompt(rl, "   VISIT_BRIDGE_TOKEN", bridgeToken);

  console.log("\n4) O seu ID — painel Admin → Demo visita (linha «ID: …»)\n");
  ownerId = await prompt(rl, "   VISIT_OWNER_USER_ID", ownerId);

  rl.close();

  if (!url || !anonKey || !bridgeToken || !ownerId) {
    console.error("\n[ERRO] Faltam dados. Volte a correr: npm run visit-print:setup\n");
    process.exit(1);
  }

  const content = `# Demo visita — Mac (${new Date().toISOString().slice(0, 10)})
# Não partilhe o VISIT_BRIDGE_TOKEN.

SUPABASE_URL=${url}
SUPABASE_ANON_KEY=${anonKey}
VISIT_BRIDGE_TOKEN=${bridgeToken}
VISIT_OWNER_USER_ID=${ownerId}
`;

  fs.writeFileSync(ENV_PATH, content, { mode: 0o600 });

  console.log(`\n✓ Guardado.\n`);
  console.log("IMPORTANTE — no Lovable:");
  console.log("  Cloud → Secrets → adicione VISIT_BRIDGE_TOKEN com o MESMO valor acima.");
  console.log("  Depois faça Publish para activar a função visit-print-bridge-api.\n");
  console.log("No Mac:");
  console.log("  npm run visit-print:helper   (deixar aberto)");
  console.log("  Painel → Ligar Mac → Imprimir teste\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
