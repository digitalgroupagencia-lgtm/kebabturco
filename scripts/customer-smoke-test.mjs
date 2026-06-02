#!/usr/bin/env node
/**
 * Smoke test do fluxo cliente — obrigatório antes de cada build.
 *
 * Valida que a área pública (cardápio/produto/carrinho/checkout) consegue
 * subir sem depender ESTATICAMENTE de módulos internos
 * (admin/panel/seller/delivery/kitchen/staff).
 *
 * Imports dinâmicos via lazy(() => import(...)) são IGNORADOS — o cliente
 * só os carrega no runtime se navegar lá, e essa rota nem existe no fluxo
 * cliente.
 *
 * Estratégia:
 *   1. Confirmar que cada ficheiro crítico existe.
 *   2. A partir desses pontos de entrada, seguir só os IMPORTS ESTÁTICOS,
 *      resolvendo aliases ("@/...").
 *   3. Se algum ficheiro alcançado estaticamente vier de zona interna,
 *      bloqueia o build.
 *
 * Sai com código 1 → prebuild aborta.
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

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

const FORBIDDEN_DIRS = [
  "src/views/admin",
  "src/views/panel",
  "src/views/seller",
  "src/views/delivery",
  "src/components/admin",
  "src/components/panel",
  "src/components/seller",
  "src/components/delivery",
  "src/components/kitchen",
  "src/components/staff",
];

const EXTS = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

function log(c, m) {
  console.log(`${c}${m}${RESET}`);
}

function resolveImport(spec, fromFile) {
  // ignora pacotes node_modules
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return null;

  let base;
  if (spec.startsWith("@/")) {
    base = path.join(SRC, spec.slice(2));
  } else {
    base = path.resolve(path.dirname(fromFile), spec);
  }

  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

// Regex para imports estáticos:
//   import ... from "x"
//   import "x"
//   export ... from "x"
const STATIC_IMPORT_RE =
  /(?:^|[\s;])(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']/gm;

function extractStaticImports(source) {
  // Remove comentários e strings dynamic-import para não causar falsos positivos
  const cleaned = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  const out = [];
  let m;
  while ((m = STATIC_IMPORT_RE.exec(cleaned)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function relFromRoot(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, "/");
}

function isForbidden(rel) {
  return FORBIDDEN_DIRS.some((d) => rel === d || rel.startsWith(d + "/"));
}

async function main() {
  log(CYAN, "\n▶ Smoke test do fluxo cliente (pré-build)\n");

  // 1. Existência
  for (const step of CRITICAL) {
    if (!fs.existsSync(path.join(ROOT, step.file))) {
      log(RED, `✗ Ficheiro em falta: ${step.file} (${step.name})`);
      process.exit(1);
    }
  }
  log(GREEN, "✓ Todos os ficheiros do fluxo cliente existem");

  // 2. Walk de imports ESTÁTICOS
  const visited = new Set();
  const hits = [];

  function walk(abs, fromPretty) {
    const rel = relFromRoot(abs);
    if (visited.has(rel)) return;
    visited.add(rel);

    if (isForbidden(rel)) {
      hits.push({ rel, from: fromPretty });
      return;
    }

    let src;
    try {
      src = fs.readFileSync(abs, "utf8");
    } catch (err) {
      log(RED, `✗ Não consegui ler ${rel}: ${err.message}`);
      process.exit(1);
    }

    for (const spec of extractStaticImports(src)) {
      const resolved = resolveImport(spec, abs);
      if (!resolved) continue;
      walk(resolved, rel);
    }
  }

  for (const step of CRITICAL) {
    log(CYAN, `  • ${step.name}`);
    walk(path.join(ROOT, step.file), "(entry)");
  }

  if (hits.length > 0) {
    log(RED, "\n✗ Fluxo cliente importa estaticamente módulos internos (PROIBIDO):");
    for (const h of hits) {
      log(YELLOW, `  - ${h.rel}\n      via ${h.from}`);
    }
    log(
      RED,
      "\n  Regra: cliente não pode depender de admin/panel/seller/staff/kitchen/delivery.",
    );
    log(
      YELLOW,
      "  Solução: usar lazy(() => import(\"...\")) ou mover a dependência para shared/.",
    );
    process.exit(1);
  }

  log(GREEN, `\n✓ ${visited.size} módulos analisados — nenhuma dependência interna estática`);
  log(GREEN, "✅ Smoke test cliente OK — deploy autorizado\n");
}

main().catch((err) => {
  log(RED, `\n✗ Smoke test crashou: ${err.message}`);
  console.error(err);
  process.exit(1);
});
