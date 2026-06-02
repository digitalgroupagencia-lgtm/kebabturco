#!/usr/bin/env node
/**
 * Smoke test do fluxo cliente — obrigatório antes de cada build.
 *
 * Valida que os módulos críticos da área pública carregam sem crash de import:
 *   - página inicial / SplashScreen
 *   - LanguageScreen (selecção idioma)
 *   - StoreSelectionScreen (loja)
 *   - HomeScreen (cardápio)
 *   - ProductScreen (abrir produto)
 *   - CartContext + ReviewScreen (carrinho)
 *
 * Não inicia browser; faz uma análise estática rigorosa:
 *   1. Os ficheiros existem.
 *   2. Vite consegue transformar (parse + resolver imports) cada um.
 *   3. Nenhum deles importa, directa ou indirectamente, de módulos
 *      proibidos (admin / panel / seller / delivery / kitchen / staff).
 *
 * Se qualquer passo falhar, sai com código 1 e BLOQUEIA o build.
 */

import { createServer } from "vite";
import path from "node:path";
import fs from "node:fs";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const CRITICAL = [
  { name: "Página inicial (Index)", file: "src/pages/Index.tsx" },
  { name: "Splash", file: "src/components/screens/SplashScreen.tsx" },
  { name: "Selecção de idioma", file: "src/components/screens/LanguageScreen.tsx" },
  { name: "Selecção de loja", file: "src/components/screens/StoreSelectionScreen.tsx" },
  { name: "Cardápio (Home)", file: "src/components/screens/HomeScreen.tsx" },
  { name: "Produto", file: "src/components/screens/ProductScreen.tsx" },
  { name: "Carrinho (Review)", file: "src/components/screens/ReviewScreen.tsx" },
  { name: "Contexto Carrinho", file: "src/contexts/CartContext.tsx" },
];

const FORBIDDEN_PREFIXES = [
  "/src/views/admin/",
  "/src/views/panel/",
  "/src/views/seller/",
  "/src/views/delivery/",
  "/src/components/admin/",
  "/src/components/panel/",
  "/src/components/seller/",
  "/src/components/delivery/",
  "/src/components/kitchen/",
  "/src/components/staff/",
];

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

function log(color, msg) {
  console.log(`${color}${msg}${RESET}`);
}

async function main() {
  log(CYAN, "\n▶ Smoke test do fluxo cliente (pré-build)\n");

  // 1. Ficheiros existem?
  for (const step of CRITICAL) {
    const abs = path.join(ROOT, step.file);
    if (!fs.existsSync(abs)) {
      log(RED, `✗ Ficheiro em falta: ${step.file} (${step.name})`);
      process.exit(1);
    }
  }
  log(GREEN, "✓ Todos os ficheiros do fluxo cliente existem");

  // 2. Vite consegue transformar cada um (parse + resolver imports)?
  const server = await createServer({
    root: ROOT,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  const visited = new Set();
  const forbiddenHits = [];

  async function walk(rel, fromPretty) {
    if (visited.has(rel)) return;
    visited.add(rel);

    for (const prefix of FORBIDDEN_PREFIXES) {
      if (rel.startsWith(prefix)) {
        forbiddenHits.push({ rel, from: fromPretty });
        return;
      }
    }

    let mod;
    try {
      mod = await server.transformRequest(rel);
    } catch (err) {
      log(RED, `\n✗ Falhou a transformar ${rel}\n  ↳ origem: ${fromPretty}\n  ↳ erro: ${err.message}`);
      await server.close();
      process.exit(1);
    }
    if (!mod) return;

    // Inspeccionar imports recursivamente (só os internos do projecto)
    const moduleNode = await server.moduleGraph.getModuleByUrl(rel);
    if (!moduleNode) return;
    for (const dep of moduleNode.importedModules) {
      if (!dep.url) continue;
      if (!dep.url.startsWith("/src/")) continue;
      await walk(dep.url, rel);
    }
  }

  try {
    for (const step of CRITICAL) {
      const rel = "/" + step.file.replace(/\\/g, "/");
      log(CYAN, `  • ${step.name}`);
      await walk(rel, "(entry)");
    }
  } finally {
    await server.close();
  }

  if (forbiddenHits.length > 0) {
    log(RED, "\n✗ Fluxo cliente importa módulos internos (proibido):");
    for (const hit of forbiddenHits) {
      log(YELLOW, `  - ${hit.rel}\n    via ${hit.from}`);
    }
    log(RED, "\n  Quebra a regra: cliente não pode depender de admin/panel/seller/staff/kitchen/delivery.");
    process.exit(1);
  }

  log(GREEN, "\n✓ Todos os módulos do fluxo cliente carregam sem erro");
  log(GREEN, "✓ Nenhuma dependência proibida (admin/panel/staff/kitchen/...)");
  log(GREEN, "\n✅ Smoke test cliente OK — deploy autorizado\n");
}

main().catch((err) => {
  log(RED, `\n✗ Smoke test crashou: ${err.message}`);
  console.error(err);
  process.exit(1);
});
