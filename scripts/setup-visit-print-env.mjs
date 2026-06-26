#!/usr/bin/env node
/**
 * Cria ou verifica ~/.kebab-visit-print.env (configuração única no Mac).
 *
 * Uso: npm run visit-print:setup
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
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
    path.join(PROJECT_DIR, "print-bridge", ".env"),
    path.join(PROJECT_DIR, "visit-print-bridge.env"),
    path.join(PROJECT_DIR, ".env"),
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
  console.log("\n=== Demo visita — configurar Mac (uma vez) ===\n");

  const existing = loadExisting(ENV_PATH);
  const fromProject = tryLoadFromProject();

  let url = existing.SUPABASE_URL || fromProject.SUPABASE_URL || fromProject.VITE_SUPABASE_URL || DEFAULT_URL;
  let serviceKey =
    existing.SUPABASE_SERVICE_ROLE_KEY ||
    fromProject.SUPABASE_SERVICE_ROLE_KEY ||
    fromProject.SUPABASE_SERVICE_KEY ||
    "";
  let ownerId = existing.VISIT_OWNER_USER_ID || fromProject.VISIT_OWNER_USER_ID || "";

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`Ficheiro: ${ENV_PATH}\n`);
  if (fs.existsSync(ENV_PATH)) {
    console.log("Já existe — pode actualizar os valores (Enter mantém o actual).\n");
  }

  console.log("1) URL do Supabase (já vem preenchida se for o projeto Kebab Turco)");
  url = await prompt(rl, "   SUPABASE_URL", url);

  console.log("\n2) Service Role Key — no Supabase: Project Settings → API → service_role");
  console.log("   (ou Lovable → Cloud → Secrets → SUPABASE_SERVICE_ROLE_KEY)\n");
  if (!serviceKey) {
    console.log("   ⚠️  Ainda não encontrámos esta chave no Mac. Cole-a abaixo.\n");
  }
  serviceKey = await prompt(rl, "   SUPABASE_SERVICE_ROLE_KEY", serviceKey);

  console.log("\n3) O seu ID de utilizador — no painel Admin → Demo visita (linha «ID: …»)\n");
  ownerId = await prompt(rl, "   VISIT_OWNER_USER_ID", ownerId);

  rl.close();

  if (!url || !serviceKey || !ownerId) {
    console.error("\n[ERRO] Faltam dados. Volte a correr: npm run visit-print:setup\n");
    process.exit(1);
  }

  const content = `# Demo visita — impressão no Mac (${new Date().toISOString().slice(0, 10)})
# Não partilhe este ficheiro (contém chave secreta).

SUPABASE_URL=${url}
SUPABASE_SERVICE_ROLE_KEY=${serviceKey}
VISIT_OWNER_USER_ID=${ownerId}
`;

  fs.writeFileSync(ENV_PATH, content, { mode: 0o600 });
  console.log(`\n✓ Guardado em ${ENV_PATH}`);
  console.log("\nPróximo passo:");
  console.log("  1. Deixe o helper aberto: npm run visit-print:helper");
  console.log("  2. No painel: Ligar Mac → Imprimir teste\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
